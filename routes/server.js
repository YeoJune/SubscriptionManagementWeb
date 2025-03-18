// routes/server.js
const express = require("express");
const app = express();

// 공통 미들웨어
app.use(express.json());

// 기능별 라우터 임포트
const authRoutes = require("./auth");
const deliveryRoutes = require("./delivery");
const noticeRoutes = require("./notice");
const paymentsRoutes = require("./payments");
const productRoutes = require("./product");
const userRoutes = require("./user");

// 라우터 등록
app.use("/api/auth", authRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/notice", noticeRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/product", productRoutes);
app.use("/api/user", userRoutes);

// 서버 포트 설정
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // 필요 시 다른 곳에서 import할 수 있도록
