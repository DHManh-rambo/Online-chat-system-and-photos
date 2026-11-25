const express = require('express');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

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