const express = require('express');
const { verifyToken, requireAdmin } = require('../middlewares/auth_middleware.js');
const dashboardController = require('../controllers/dashboard_controller.js');

const router = express.Router();

// Mọi route dashboard đều yêu cầu đăng nhập và phải là admin
router.use(verifyToken, requireAdmin);

// GET /api/dashboard/overview
router.get('/overview', dashboardController.overview);

module.exports = router;