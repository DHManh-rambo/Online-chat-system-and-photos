// Chuyển dữ liệu user cũ sang model mới.
//   node scripts/migrateUsers.js          -> chạy thử, chỉ in ra
//   node scripts/migrateUsers.js --apply  -> ghi thật
const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../config/fire_base');

const APPLY = process.argv.includes('--apply');

const normRole = (r) => (r === 'admin' ? 'admin' : 'customer');
const normStatus = (s) =>
    s === 'pending' || s === 'active' || s === 'locked' ? s : s === 'disabled' ? 'locked' : 'active';

(async () => {
    const snap = await db.collection('users').get();
    console.log(`${snap.size} tài khoản. Chế độ: ${APPLY ? 'GHI THẬT' : 'chạy thử'}`);

    for (const doc of snap.docs) {
        const d = doc.data();
        const status = normStatus(d.status);

        let emailVerified = false;
        try {
            const au = await auth.getUser(doc.id);
            emailVerified = au.emailVerified;
            // Tài khoản cũ đang dùng bình thường -> coi như đã xác thực
            if (!emailVerified && status !== 'pending' && APPLY) {
                await auth.updateUser(doc.id, { emailVerified: true });
                emailVerified = true;
            } else if (!emailVerified && status !== 'pending') {
                emailVerified = true;
            }
        } catch {
            console.warn(`  ! ${doc.id}: không có trong Auth, bỏ qua`);
            continue;
        }

        const patch = {
            fullName: d.fullName ?? d.displayName ?? '',
            phone: d.phone ?? d.phoneNumber ?? null,
            avatarUrl: d.avatarUrl ?? d.photoURL ?? null,
            dateOfBirth: d.dateOfBirth ?? null,
            role: normRole(d.role),
            status,
            emailVerified,
            updatedAt: FieldValue.serverTimestamp(),
            displayName: FieldValue.delete(),
            phoneNumber: FieldValue.delete(),
            photoURL: FieldValue.delete(),
        };

        console.log(`  - ${d.email}: ${d.role}/${d.status} -> ${patch.role}/${patch.status}`);
        if (APPLY) await doc.ref.set(patch, { merge: true });
    }
    console.log('Xong.');
    process.exit(0);
})();