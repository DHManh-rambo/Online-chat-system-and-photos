require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth/auth_routes.js');
const userRoutes = require('./routes/user_routes.js');
const dashboardRoutes = require('./routes/dashboard_routes.js');
const { notFound, errorHandler } = require('./utils/app_error.js');

const app = express();

// Danh sách origin được phép gọi API, đọc từ biến môi trường CORS_ORIGINS
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Locket API is running!' });
});

// 1. Các route nghiệp vụ
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 2. notFound và errorHandler LUÔN đặt cuối cùng
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
console.log('CORS cho phép:', allowedOrigins);