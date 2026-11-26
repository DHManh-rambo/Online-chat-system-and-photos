const { db } = require('../config/fire_base');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const vnDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

// Trả về mốc 0h sáng của ngày chứa `date` theo giờ Việt Nam
function startOfVnDay(date) {
    const shifted = date.getTime() + VIETNAM_OFFSET_MS;
    return new Date(shifted - (shifted % ONE_DAY_MS) - VIETNAM_OFFSET_MS);
}

// Đếm số document khớp với query
async function countDocuments(query) {
    const snapshot = await query.count().get();
    return snapshot.data().count;
}

async function getOverview() {
    const usersCollection = db.collection('users');

    const todayStart = startOfVnDay(new Date());
    const weekStart = new Date(todayStart.getTime() - 6 * ONE_DAY_MS);

    const [total, pending, active, locked, admins, customers, recentSignups] = await Promise.all([
        countDocuments(usersCollection),
        countDocuments(usersCollection.where('status', '==', 'pending')),
        countDocuments(usersCollection.where('status', '==', 'active')),
        countDocuments(usersCollection.where('status', '==', 'locked')),
        countDocuments(usersCollection.where('role', '==', 'admin')),
        countDocuments(usersCollection.where('role', '==', 'customer')),
        usersCollection.where('createdAt', '>=', weekStart).select('createdAt').get(),
    ]);

    // Tạo sẵn 7 bucket theo ngày (kể cả ngày không có ai đăng ký)
    const bucketsByDate = new Map();
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart.getTime() + i * ONE_DAY_MS);
        bucketsByDate.set(vnDateFormatter.format(date), 0);
    }

    recentSignups.forEach((doc) => {
        const createdAt = doc.get('createdAt')?.toDate?.();
        if (!createdAt) return;

        const dateKey = vnDateFormatter.format(createdAt);
        if (bucketsByDate.has(dateKey)) {
            bucketsByDate.set(dateKey, bucketsByDate.get(dateKey) + 1);
        }
    });

    const signupsByDay = [...bucketsByDate].map(([date, count]) => ({ date, count }));

    return {
        total,
        byStatus: { pending, active, locked },
        byRole: { admin: admins, customer: customers },
        newToday: signupsByDay[6].count,
        new7Days: signupsByDay.reduce((sum, item) => sum + item.count, 0),
        signupsByDay,
    };
}

module.exports = { getOverview };