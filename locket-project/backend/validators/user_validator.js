const { AppError } = require('../utils/app_error');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(0|\+84)\d{9}$/; // giống app mobile

const ALLOWED_ROLES = ['customer', 'admin'];
// Admin chỉ được đặt active/locked. 'pending' do luồng đăng ký tự sinh ra.
const ALLOWED_STATUSES = ['active', 'locked'];

// Ném lỗi validation với HTTP 400
function failValidation(message) {
    throw new AppError(message, 400, 'validation_error');
}

function validateEmail(email) {
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
        failValidation('Email không hợp lệ');
    }
    return email.trim().toLowerCase();
}

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 6) {
        failValidation('Mật khẩu phải có ít nhất 6 ký tự');
    }
    return password;
}

function validateFullName(name) {
    if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
        failValidation('Họ tên phải từ 1 đến 50 ký tự');
    }
    return name.trim();
}

// Trả về null nếu để trống
function validatePhone(phone) {
    if (phone === undefined || phone === null || phone === '') {
        return null;
    }
    const normalized = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
    if (!PHONE_REGEX.test(normalized)) {
        failValidation('Số điện thoại không hợp lệ');
    }
    return normalized;
}

// Nhận 'YYYY-MM-DD', trả về Date (0h giờ Việt Nam) hoặc null nếu để trống
function validateDateOfBirth(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        failValidation('Ngày sinh không hợp lệ (định dạng YYYY-MM-DD)');
    }

    const date = new Date(`${value}T00:00:00+07:00`);
    if (Number.isNaN(date.getTime()) || date > new Date() || date.getUTCFullYear() < 1900) {
        failValidation('Ngày sinh không hợp lệ');
    }
    return date;
}

function validateCreate(body = {}) {
    const role = body.role ?? 'customer';
    if (!ALLOWED_ROLES.includes(role)) {
        failValidation('Quyền phải là customer hoặc admin');
    }

    return {
        email: validateEmail(body.email),
        password: validatePassword(body.password),
        fullName: validateFullName(body.fullName),
        phone: validatePhone(body.phone),
        dateOfBirth: validateDateOfBirth(body.dateOfBirth),
        role,
    };
}

// Chỉ nhận các field được phép sửa; field nào không gửi thì bỏ qua
function validateUpdate(body = {}) {
    const data = {};

    if (body.email !== undefined) {
        data.email = validateEmail(body.email);
    }
    if (body.fullName !== undefined) {
        data.fullName = validateFullName(body.fullName);
    }
    if (body.phone !== undefined) {
        data.phone = validatePhone(body.phone);
    }
    if (body.dateOfBirth !== undefined) {
        data.dateOfBirth = validateDateOfBirth(body.dateOfBirth);
    }

    if (Object.keys(data).length === 0) {
        failValidation('Không có dữ liệu để cập nhật');
    }
    return data;
}

function validateStatus(body = {}) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
        failValidation('Trạng thái phải là active hoặc locked');
    }
    return body.status;
}

function validateNewPassword(body = {}) {
    return validatePassword(body.newPassword);
}

module.exports = {
    validateCreate,
    validateUpdate,
    validateStatus,
    validateNewPassword,
};