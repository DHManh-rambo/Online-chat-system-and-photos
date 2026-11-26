// utils/app_error.js
//
// Gộp từ:
//   - middleware xử lý lỗi (notFound, errorHandler)
//   - class AppError
//
// Cách dùng:
//   const { AppError, notFound, errorHandler } = require('../utils/app_error');

// =============================================================
// 1. Bảng tra cứu mã lỗi Firebase Admin SDK
//    key  : mã lỗi Firebase
//    value: [HTTP status, thông điệp trả về client]
// =============================================================
const FIREBASE_ERRORS = {
    'auth/user-not-found': [404, 'Không tìm thấy tài khoản'],
    'auth/email-already-exists': [409, 'Email đã được sử dụng'],
    'auth/invalid-email': [400, 'Email không hợp lệ'],
    'auth/invalid-password': [400, 'Mật khẩu không hợp lệ (tối thiểu 6 ký tự)'],
    'auth/invalid-display-name': [400, 'Tên hiển thị không hợp lệ'],
};

// =============================================================
// 2. AppError - lỗi có sẵn HTTP status & code rõ ràng
//    Dùng khi muốn chủ động ném lỗi, ví dụ:
//      throw new AppError('Email đã tồn tại', 409, 'email_exists');
// =============================================================
class AppError extends Error {
    constructor(message, status = 400, code = 'bad_request') {
        super(message);
        this.status = status;
        this.code = code;
    }
}

// =============================================================
// 3. Middleware bắt route không tồn tại (đặt sau tất cả route)
// =============================================================
function notFound(req, res) {
    res.status(404).json({
        success: false,
        code: 'not_found',
        message: 'Không tìm thấy đường dẫn',
    });
}

// =============================================================
// 4. Middleware xử lý lỗi tập trung (đặt cuối cùng của app)
//    - Chuẩn hoá lỗi Firebase
//    - Chuẩn hoá lỗi JSON sai cú pháp
//    - Ẩn chi tiết lỗi 500, log ra server
// =============================================================
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    let status = err.status || 500;
    let message = err.message;
    let code = err.code || 'server_error';

    // Lỗi từ Firebase Admin SDK
    if (typeof err.code === 'string' && FIREBASE_ERRORS[err.code]) {
        [status, message] = FIREBASE_ERRORS[err.code];
        code = err.code;
    }

    // JSON gửi lên bị sai cú pháp
    if (err.type === 'entity.parse.failed') {
        status = 400;
        message = 'JSON không hợp lệ';
        code = 'bad_json';
    }

    // Lỗi không xác định -> 500, ẩn chi tiết, log để debug
    if (status === 500) {
        console.error(err);
        message = 'Lỗi máy chủ';
        code = 'server_error';
    }

    res.status(status).json({ success: false, code, message });
}

// =============================================================
// 5. Export
// =============================================================
module.exports = { AppError, notFound, errorHandler };