const dashboardService = require('../services/dashboard_service');

// GET /api/dashboard/overview
// Trả về số liệu tổng quan cho trang dashboard của admin
exports.overview = async (req, res) => {
    const data = await dashboardService.getOverview();
    res.json({ success: true, data });
};