// routes/server.js
const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();

dotenv.config();

// 기능별 라우터 임포트
const authRoutes = require('./auth');
const deliveryRoutes = require('./delivery');
const noticeRoutes = require('./notices');
const paymentsRoutes = require('./payments');
const productRoutes = require('./product');
const userRoutes = require('./users');

// 라우터 등록
router.use('/auth', authRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/notices', noticeRoutes);
router.use('/payments', paymentsRoutes);
router.use('/product', productRoutes);
router.use('/users', userRoutes);

module.exports = router; // 필요 시 다른 곳에서 import할 수 있도록
