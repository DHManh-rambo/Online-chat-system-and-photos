const userService = require('../services/user_service');
const userValidator = require('../validators/user_validator');

// GET /api/users
// Danh sách user có phân trang, tìm kiếm, lọc
exports.list = async (req, res) => {
    const data = await userService.listUsers(req.query);
    res.json({ success: true, data });
};

// GET /api/users/:uid
// Xem chi tiết một user
exports.getOne = async (req, res) => {
    const user = await userService.getUser(req.params.uid);
    res.json({ success: true, data: user });
};

// POST /api/users
// Admin tạo tài khoản mới
exports.create = async (req, res) => {
    const user = await userService.createUser(userValidator.validateCreate(req.body));
    res.status(201).json({ success: true, data: user });
};

// PUT /api/users/:uid
// Cập nhật thông tin user
exports.update = async (req, res) => {
    const user = await userService.updateUser(
        req.params.uid,
        userValidator.validateUpdate(req.body)
    );
    res.json({ success: true, data: user });
};

// PATCH /api/users/:uid/status
// Khóa / mở khóa / kích hoạt tài khoản
exports.setStatus = async (req, res) => {
    const user = await userService.setStatus(
        req.params.uid,
        userValidator.validateStatus(req.body),
        req.user.uid
    );
    res.json({ success: true, data: user });
};

// POST /api/users/:uid/reset-email
// Gửi email đặt lại mật khẩu
exports.sendResetEmail = async (req, res) => {
    const result = await userService.sendResetEmail(req.params.uid);
    res.json({
        success: true,
        message: `Đã gửi email đặt lại mật khẩu tới ${result.email}`,
    });
};

// POST /api/users/:uid/password
// Admin đặt mật khẩu mới trực tiếp
exports.setPassword = async (req, res) => {
    await userService.setPassword(
        req.params.uid,
        userValidator.validateNewPassword(req.body)
    );
    res.json({ success: true, message: 'Đã đổi mật khẩu' });
};

// DELETE /api/users/:uid
// Xóa tài khoản
exports.remove = async (req, res) => {
    await userService.deleteUser(req.params.uid, req.user.uid);
    res.json({ success: true, message: 'Đã xóa tài khoản' });
};