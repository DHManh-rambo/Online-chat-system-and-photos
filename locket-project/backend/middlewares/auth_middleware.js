const { auth } = require('../config/fire_base');
const { AppError } = require('../utils/app_error');

// Xác thực ID Token trong header: Authorization: Bearer <token>
async function verifyToken(req, res, next) {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        throw new AppError('Thiếu token đăng nhập', 401, 'missing_token');
    }

    const token = header.slice('Bearer '.length);

    try {
        // Tham số `true`: kiểm tra token đã bị thu hồi hoặc tài khoản đã bị khóa chưa
        req.user = await auth.verifyIdToken(token, true);
    } catch (err) {
        throw new AppError('Token không hợp lệ hoặc đã hết hạn', 401, 'invalid_token');
    }

    next();
}

// Chỉ cho qua nếu token có Custom Claim admin === true
function requireAdmin(req, res, next) {
    if (!req.user || req.user.admin !== true) {
        throw new AppError('Bạn không có quyền quản trị', 403, 'forbidden');
    }
    next();
}

module.exports = { verifyToken, requireAdmin };