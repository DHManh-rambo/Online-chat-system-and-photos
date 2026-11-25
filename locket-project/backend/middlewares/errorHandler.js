const FIREBASE_ERRORS = {
    'auth/user-not-found': [404, 'Không tìm thấy tài khoản'],
    'auth/email-already-exists': [409, 'Email đã được sử dụng'],
    'auth/invalid-email': [400, 'Email không hợp lệ'],
    'auth/invalid-password': [400, 'Mật khẩu không hợp lệ (tối thiểu 6 ký tự)'],
    'auth/invalid-display-name': [400, 'Tên hiển thị không hợp lệ'],
};

function notFound(req, res) {
    res.status(404).json({
        success: false,
        code: 'not_found',
        message: 'Không tìm thấy đường dẫn',
    });
}

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

    if (status === 500) {
        console.error(err);
        message = 'Lỗi máy chủ';
        code = 'server_error';
    }

    res.status(status).json({ success: false, code, message });
}

module.exports = { notFound, errorHandler };