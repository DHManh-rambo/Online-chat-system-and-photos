const express = require('express');
const { verifyToken } = require('../../middlewares/auth_middleware.js');

const router = express.Router();

// GET /api/me
// Trả về thông tin của user đang đăng nhập
router.get('/me', verifyToken, (req, res) => {
    res.json({
        success: true,
        data: {
            uid: req.user.uid,
            email: req.user.email,
            isAdmin: req.user.admin === true,
        },
    });
});

module.exports = router;