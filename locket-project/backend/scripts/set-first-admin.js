const { auth, db } = require('../config/firebase');

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Cách dùng: node scripts/set-first-admin.js <email>');
        process.exit(1);
    }

    // 1. Tìm user trong Firebase Authentication
    const user = await auth.getUserByEmail(email);

    // 2. Gắn Custom Claim (nguồn sự thật cho phân quyền)
    await auth.setCustomUserClaims(user.uid, {
        ...(user.customClaims || {}),
        admin: true,
    });

    // 3. Cập nhật bản sao role trong Firestore (Admin SDK bỏ qua Security Rules)
    await db.collection('users').doc(user.uid).update({ role: 'admin' });

    console.log(`Đã cấp quyền admin cho ${email} (uid: ${user.uid})`);
    process.exit(0);
}

main().catch((err) => {
    console.error('Lỗi:', err.message);
    process.exit(1);
});