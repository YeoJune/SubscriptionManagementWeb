// routes/index.js
const dotenv = require('dotenv');
const express = require('express');
const router = express.Router();

dotenv.config();

// 기능별 라우터 임포트
const authRoutes = require('./auth');
const deliveryRoutes = require('./delivery');
const noticeRoutes = require('./notices');
const paymentsRoutes = require('./payments');
const productRoutes = require('./products');
const userRoutes = require('./users');
const inquiryRoutes = require('./inquiry');
const heroRoutes = require('./hero');

// 라우터 등록
router.use('/auth', authRoutes);
router.use('/delivery', deliveryRoutes);
router.use('/notices', noticeRoutes);
router.use('/payments', paymentsRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/hero', heroRoutes);

module.exports = router;
