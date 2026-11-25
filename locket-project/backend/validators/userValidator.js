const AppError = require('../utils/appError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['user', 'admin'];
const STATUSES = ['active', 'disabled'];

function fail(message) {
    throw new AppError(message, 400, 'validation_error');
}

function checkEmail(email) {
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
        fail('Email không hợp lệ');
    }
    return email.trim().toLowerCase();
}

function checkPassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        fail('Mật khẩu phải có ít nhất 8 ký tự');
    }
    return password;
}

function checkName(name) {
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
        fail('Tên hiển thị phải từ 1 đến 50 ký tự');
    }
    return name.trim();
}

function checkPhone(phone) {
    if (phone === '' || phone === null) return '';
    if (typeof phone !== 'string' || !/^[0-9+\s-]{8,15}$/.test(phone)) {
        fail('Số điện thoại không hợp lệ');
    }
    return phone.trim();
}

function validateCreate(body = {}) {
    const role = body.role ?? 'user';
    if (!ROLES.includes(role)) fail('Quyền phải là user hoặc admin');

    return {
        email: checkEmail(body.email),
        password: checkPassword(body.password),
        displayName: checkName(body.displayName),
        role,
    };
}

// Chỉ nhận các field được phép sửa; field nào không gửi thì bỏ qua
function validateUpdate(body = {}) {
    const data = {};

    if (body.email !== undefined) data.email = checkEmail(body.email);
    if (body.displayName !== undefined) data.displayName = checkName(body.displayName);
    if (body.phoneNumber !== undefined) data.phoneNumber = checkPhone(body.phoneNumber);

    if (Object.keys(data).length === 0) fail('Không có dữ liệu để cập nhật');
    return data;
}

function validateStatus(body = {}) {
    if (!STATUSES.includes(body.status)) fail('Trạng thái phải là active hoặc disabled');
    return body.status;
}

function validateRole(body = {}) {
    if (!ROLES.includes(body.role)) fail('Quyền phải là user hoặc admin');
    return body.role;
}

function validateNewPassword(body = {}) {
    return checkPassword(body.newPassword);
}

module.exports = {
    validateCreate,
    validateUpdate,
    validateStatus,
    validateRole,
    validateNewPassword,
};