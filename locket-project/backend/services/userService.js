const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../config/firebase');
const AppError = require('../utils/appError');

const users = () => db.collection('users');

// Chuẩn hóa dữ liệu trả về cho web
function toDto(uid, data = {}, authUser = null) {
    const created = data.createdAt;
    return {
        uid,
        email: data.email ?? authUser?.email ?? '',
        displayName: data.displayName ?? authUser?.displayName ?? '',
        phoneNumber: data.phoneNumber ?? '',
        photoURL: data.photoURL ?? null,
        role: data.role ?? 'user',
        status: data.status ?? 'active',
        createdAt: created?.toDate ? created.toDate().toISOString() : null,
        // Trạng thái thật trong Firebase Authentication
        authDisabled: authUser ? authUser.disabled : null,
        isAdminClaim: authUser ? authUser.customClaims?.admin === true : null,
    };
}

// ---------- Xem ----------

async function listUsers({ search = '', page = 1, limit = 20 } = {}) {
    const snap = await users().limit(1000).get();
    const keyword = String(search).trim().toLowerCase();

    let list = snap.docs.map((d) => toDto(d.id, d.data()));

    if (keyword) {
        list = list.filter(
            (u) =>
                u.email.toLowerCase().includes(keyword) ||
                u.displayName.toLowerCase().includes(keyword)
        );
    }

    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const size = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const start = (pageNum - 1) * size;

    return {
        users: list.slice(start, start + size),
        total: list.length,
        page: pageNum,
        limit: size,
    };
}

async function getUser(uid) {
    const authUser = await auth.getUser(uid); // ném auth/user-not-found nếu không có
    const doc = await users().doc(uid).get();
    return toDto(uid, doc.exists ? doc.data() : {}, authUser);
}

// ---------- Thêm ----------

async function createUser({ email, password, displayName, role }) {
    const authUser = await auth.createUser({ email, password, displayName });

    try {
        if (role === 'admin') {
            await auth.setCustomUserClaims(authUser.uid, { admin: true });
        }

        await users().doc(authUser.uid).set({
            uid: authUser.uid,
            email,
            displayName,
            photoURL: null,
            role,
            status: 'active',
            createdAt: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // Ghi Firestore lỗi thì xóa user vừa tạo để dữ liệu không bị lệch
        await auth.deleteUser(authUser.uid).catch(() => { });
        throw err;
    }

    return getUser(authUser.uid);
}

// ---------- Sửa ----------

async function updateUser(uid, data) {
    const authChanges = {};
    if (data.email !== undefined) authChanges.email = data.email;
    if (data.displayName !== undefined) authChanges.displayName = data.displayName;

    if (Object.keys(authChanges).length > 0) {
        await auth.updateUser(uid, authChanges);
    }

    await users().doc(uid).set(data, { merge: true });
    return getUser(uid);
}

// ---------- Khóa / mở khóa ----------

async function setStatus(uid, status, actorUid) {
    if (uid === actorUid) {
        throw new AppError('Không thể tự khóa tài khoản của mình', 400, 'self_action');
    }

    const disabled = status === 'disabled';
    await auth.updateUser(uid, { disabled });
    if (disabled) await auth.revokeRefreshTokens(uid); // đá user ra khỏi mọi thiết bị

    await users().doc(uid).set({ status }, { merge: true });
    return getUser(uid);
}

// ---------- Đổi quyền ----------

async function setRole(uid, role, actorUid) {
    if (uid === actorUid) {
        throw new AppError('Không thể tự đổi quyền của mình', 400, 'self_action');
    }

    const authUser = await auth.getUser(uid);
    const claims = { ...(authUser.customClaims || {}) };

    if (role === 'admin') claims.admin = true;
    else delete claims.admin;

    await auth.setCustomUserClaims(uid, claims);
    await auth.revokeRefreshTokens(uid); // buộc đăng nhập lại để nhận quyền mới

    await users().doc(uid).set({ role }, { merge: true });
    return getUser(uid);
}

// ---------- Xóa ----------

async function deleteUser(uid, actorUid) {
    if (uid === actorUid) {
        throw new AppError('Không thể tự xóa tài khoản của mình', 400, 'self_action');
    }

    try {
        await auth.deleteUser(uid);
    } catch (err) {
        // Nếu Auth không còn nhưng Firestore còn thì vẫn dọn Firestore
        if (err.code !== 'auth/user-not-found') throw err;
    }

    await users().doc(uid).delete();
}

// ---------- Mật khẩu ----------

// Cách 1: Firebase gửi email đặt lại mật khẩu cho người dùng
async function sendResetEmail(uid) {
    const authUser = await auth.getUser(uid);

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
        throw new AppError('Server chưa cấu hình FIREBASE_API_KEY', 500, 'server_error');
    }

    const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: authUser.email }),
        }
    );

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error('sendOobCode lỗi:', body?.error?.message);
        throw new AppError('Không gửi được email đặt lại mật khẩu', 502, 'email_failed');
    }

    return { email: authUser.email };
}

// Cách 2: admin đặt mật khẩu mới trực tiếp
async function setPassword(uid, newPassword) {
    await auth.updateUser(uid, { password: newPassword });
    await auth.revokeRefreshTokens(uid); // đăng xuất các phiên cũ
}

module.exports = {
    listUsers,
    getUser,
    createUser,
    updateUser,
    setStatus,
    setRole,
    deleteUser,
    sendResetEmail,
    setPassword,
};