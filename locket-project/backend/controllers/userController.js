const userService = require('../services/userService');
const v = require('../validators/userValidator');

exports.list = async (req, res) => {
    const data = await userService.listUsers(req.query);
    res.json({ success: true, data });
};

exports.getOne = async (req, res) => {
    const user = await userService.getUser(req.params.uid);
    res.json({ success: true, data: user });
};

exports.create = async (req, res) => {
    const user = await userService.createUser(v.validateCreate(req.body));
    res.status(201).json({ success: true, data: user });
};

exports.update = async (req, res) => {
    const user = await userService.updateUser(req.params.uid, v.validateUpdate(req.body));
    res.json({ success: true, data: user });
};

exports.setStatus = async (req, res) => {
    const user = await userService.setStatus(
        req.params.uid,
        v.validateStatus(req.body),
        req.user.uid
    );
    res.json({ success: true, data: user });
};

exports.setRole = async (req, res) => {
    const user = await userService.setRole(
        req.params.uid,
        v.validateRole(req.body),
        req.user.uid
    );
    res.json({ success: true, data: user });
};

exports.sendResetEmail = async (req, res) => {
    const result = await userService.sendResetEmail(req.params.uid);
    res.json({
        success: true,
        message: `Đã gửi email đặt lại mật khẩu tới ${result.email}`,
    });
};

exports.setPassword = async (req, res) => {
    await userService.setPassword(req.params.uid, v.validateNewPassword(req.body));
    res.json({ success: true, message: 'Đã đổi mật khẩu' });
};

exports.remove = async (req, res) => {
    await userService.deleteUser(req.params.uid, req.user.uid);
    res.json({ success: true, message: 'Đã xóa tài khoản' });
};