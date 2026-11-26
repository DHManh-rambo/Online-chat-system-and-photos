const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../config/fire_base');
const { AppError } = require('../utils/app_error');

// Trả về Firestore collection 'users'
function usersCollection() {
    return db.collection('users');
}

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

// Chuyển Firestore Timestamp (hoặc Date) về JS Date, trả về null nếu không có
function toJsDate(value) {
    return value?.toDate ? value.toDate() : null;
}

// Chuẩn hóa role: chỉ 'admin' mới là admin, còn lại đều là 'customer'
function normalizeRole(role) {
    return role === 'admin' ? 'admin' : 'customer';
}

// Chuẩn hóa status về model mới: pending / active / locked
function normalizeStatus(status) {
    if (status === 'pending' || status === 'active' || status === 'locked') {
        return status;
    }
    if (status === 'disabled') {
        return 'locked'; // dữ liệu cũ dùng 'disabled'
    }
    return 'pending';
}

// Chuyển dữ liệu Firestore + Auth về DTO trả cho client
function toDto(uid, data = {}, authUser = null) {
    const createdAt = toJsDate(data.createdAt);
    const updatedAt = toJsDate(data.updatedAt);
    const dateOfBirth = toJsDate(data.dateOfBirth);

    return {
        uid,
        email: data.email ?? authUser?.email ?? '',
        fullName: data.fullName ?? data.displayName ?? authUser?.displayName ?? '',
        phone: data.phone ?? data.phoneNumber ?? '',
        avatarUrl: data.avatarUrl ?? data.photoURL ?? null,
        // dateOfBirth trả về dạng 'YYYY-MM-DD' theo giờ Việt Nam
        dateOfBirth: dateOfBirth ? vnDateFormatter.format(dateOfBirth) : null,
        role: normalizeRole(data.role),
        status: normalizeStatus(data.status),
        emailVerified: authUser ? authUser.emailVerified : data.emailVerified === true,
        createdAt: createdAt ? createdAt.toISOString() : null,
        updatedAt: updatedAt ? updatedAt.toISOString() : null,
        // Trạng thái thật trên Firebase Authentication
        authDisabled: authUser ? authUser.disabled : null,
        isAdminClaim: authUser ? authUser.customClaims?.admin === true : null,
    };
}

// ---------- Xem ----------

async function listUsers({ search = '', role = '', status = '', page = 1, limit = 20 } = {}) {
    // Đọc toàn bộ users để tìm kiếm substring và phân trang không bị cắt ở 1.000 hồ sơ.
    const snapshot = await usersCollection().get();
    const keyword = String(search).trim().toLowerCase();

    let list = snapshot.docs.map((doc) => toDto(doc.id, doc.data()));

    if (role) {
        list = list.filter((user) => user.role === role);
    }
    if (status) {
        list = list.filter((user) => user.status === status);
    }

    if (keyword) {
        list = list.filter(
            (user) =>
                user.email.toLowerCase().includes(keyword) ||
                user.fullName.toLowerCase().includes(keyword) ||
                user.phone.includes(keyword)
        );
    }

    // Mới nhất lên đầu
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const startIndex = (pageNumber - 1) * pageSize;

    return {
        users: list.slice(startIndex, startIndex + pageSize),
        total: list.length,
        page: pageNumber,
        limit: pageSize,
    };
}

async function getUser(uid) {
    // auth.getUser sẽ ném lỗi 'auth/user-not-found' nếu uid không tồn tại
    const authUser = await auth.getUser(uid);
    const doc = await usersCollection().doc(uid).get();
    return toDto(uid, doc.exists ? doc.data() : {}, authUser);
}

// ---------- Thêm ----------

// Admin tạo tài khoản: coi như đã được admin xác nhận -> emailVerified + active
async function createUser({ email, password, fullName, phone, dateOfBirth, role }) {
    const authUser = await auth.createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: true,
    });

    try {
        if (role === 'admin') {
            await auth.setCustomUserClaims(authUser.uid, { admin: true });
        }

        await usersCollection().doc(authUser.uid).set({
            uid: authUser.uid,
            fullName,
            email,
            emailVerified: true,
            phone,
            role,
            status: 'active',
            avatarUrl: null,
            dateOfBirth,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
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
    // Đảm bảo user tồn tại trước khi ghi Firestore, tránh tạo doc "ma"
    const authUser = await auth.getUser(uid);

    const isEmailChanged =
        data.email !== undefined &&
        data.email.toLowerCase() !== (authUser.email || '').toLowerCase();

    if (isEmailChanged && authUser.emailVerified) {
        throw new AppError(
            'Không thể đổi email vì tài khoản đã xác thực',
            400,
            'email_already_verified'
        );
    }

    const authChanges = {};
    if (isEmailChanged) {
        authChanges.email = data.email;
    }
    if (data.fullName !== undefined) {
        authChanges.displayName = data.fullName;
    }

    if (Object.keys(authChanges).length > 0) {
        await auth.updateUser(uid, authChanges);
    }

    await usersCollection()
        .doc(uid)
        .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return getUser(uid);
}

// ---------- Khóa / mở khóa / kích hoạt ----------

async function setStatus(uid, status, actorUid) {
    if (uid === actorUid) {
        throw new AppError('Không thể tự khóa tài khoản của mình', 400, 'self_action');
    }

    const authUser = await auth.getUser(uid);
    const doc = await usersCollection().doc(uid).get();
    const currentStatus = normalizeStatus(doc.exists ? doc.data().status : undefined);

    let nextStatus;
    let authPatch;

    if (status === 'locked') {
        // Khóa tài khoản
        nextStatus = 'locked';
        authPatch = { disabled: true };
    } else if (currentStatus === 'pending') {
        // Admin kích hoạt tay một tài khoản đang chờ xác thực
        nextStatus = 'active';
        authPatch = { disabled: false, emailVerified: true };
    } else {
        // Mở khóa: về active, hoặc pending nếu email chưa từng xác thực
        nextStatus = authUser.emailVerified ? 'active' : 'pending';
        authPatch = { disabled: false };
    }

    await auth.updateUser(uid, authPatch);

    if (nextStatus === 'locked') {
        // Đá user ra khỏi mọi thiết bị đang đăng nhập
        await auth.revokeRefreshTokens(uid);
    }

    await usersCollection()
        .doc(uid)
        .set(
            {
                status: nextStatus,
                emailVerified: authPatch.emailVerified ?? authUser.emailVerified,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

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
        if (err.code !== 'auth/user-not-found') {
            throw err;
        }
    }

    await usersCollection().doc(uid).delete();
}

// ---------- Mật khẩu ----------

// Cách 1: Firebase gửi email đặt lại mật khẩu cho người dùng
async function sendResetEmail(uid) {
    const authUser = await auth.getUser(uid);

    const apiKey = process.env.FIREBASE_API_KEY;
    if (!apiKey) {
        throw new AppError('Server chưa cấu hình FIREBASE_API_KEY', 500, 'server_error');
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requestType: 'PASSWORD_RESET',
                email: authUser.email,
            }),
        }
    );

    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
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
    deleteUser,
    sendResetEmail,
    setPassword,
};