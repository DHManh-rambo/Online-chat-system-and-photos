const express = require('express');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');
const c = require('../controllers/userController');

const router = express.Router();

// Mọi route trong file này chỉ dành cho admin
router.use(verifyToken, requireAdmin);

router.get('/', c.list);
router.post('/', c.create);

router.get('/:uid', c.getOne);
router.put('/:uid', c.update);
router.delete('/:uid', c.remove);

router.patch('/:uid/status', c.setStatus);
router.patch('/:uid/role', c.setRole);
router.post('/:uid/reset-email', c.sendResetEmail);
router.post('/:uid/password', c.setPassword);

module.exports = router;