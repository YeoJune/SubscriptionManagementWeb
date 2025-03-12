// routes/server.js
const express = require("express");
const app = express();

// 공통 미들웨어
app.use(express.json());

// 기능별 라우터 임포트
const adminRoutes = require("./admin");
const authRoutes = require("./auth");
const boardRoutes = require("./board");
const deliveryRoutes = require("./delivery");
const menuRoutes = require("./menu");
const notificationsRoutes = require("./notifications");
const paymentsRoutes = require("./payments");
const shippingRoutes = require("./shipping");
const statisticsRoutes = require("./statistics");

// 라우터 연결
app.use("/admin", adminRoutes);            // 관리자 기능
app.use("/auth", authRoutes);              // 회원가입/로그인 등 인증
app.use("/board", boardRoutes);            // 게시판(공지사항, FAQ, 1:1 문의 등)
app.use("/delivery", deliveryRoutes);      // 배송 일정 관리
app.use("/menu", menuRoutes);              // 메뉴 관리
app.use("/notifications", notificationsRoutes); // 알림톡, 문자 발송
app.use("/payments", paymentsRoutes);      // 결제 기능
app.use("/shipping", shippingRoutes);      // 배송 지역 설정
app.use("/statistics", statisticsRoutes);  // 통계/리포트 기능

// 서버 포트 설정
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app; // 필요 시 다른 곳에서 import할 수 있도록

