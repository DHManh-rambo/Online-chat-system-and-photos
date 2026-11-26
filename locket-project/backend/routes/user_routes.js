const express = require('express');
const { verifyToken, requireAdmin } = require('../middlewares/auth_middleware.js');
const userController = require('../controllers/user_controller.js');

const router = express.Router();

// Mọi route trong file này chỉ dành cho admin
router.use(verifyToken, requireAdmin);

router.get('/', userController.list);
router.post('/', userController.create);

router.get('/:uid', userController.getOne);
router.put('/:uid', userController.update);
router.delete('/:uid', userController.remove);

router.patch('/:uid/status', userController.setStatus);
router.post('/:uid/reset-email', userController.sendResetEmail);
router.post('/:uid/password', userController.setPassword);

module.exports = router;