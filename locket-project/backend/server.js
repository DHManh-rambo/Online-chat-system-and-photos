require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Chỉ cho các web trong CORS_ORIGINS (file .env) gọi API
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
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

// 2. notFound và errorHandler LUÔN đặt cuối cùng
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
console.log('CORS cho phép:', allowedOrigins);