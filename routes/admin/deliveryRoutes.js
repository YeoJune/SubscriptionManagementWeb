// routes/admin/deliveryRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// GET /admin/delivery/schedule
router.get("/schedule", checkAdmin, (req, res) => {
  // TODO: 배송 일정 조회
  // 관리자 권한으로 고객의 배송 일정을 조회하고, 배송 일정을 반환
  // 관리자만 접근 가능

  res.send(`GET /admin/delivery/schedule`);
});

router.get("/schedule/:id", checkAdmin, (req, res) => {
  // TODO: 배송 일정 조회
  // 관리자 권한으로 고객의 배송 일정을 조회하고, 배송 일정을 반환
  // 관리자만 접근 가능
  // 배송 일정 ID: ${req.params.id}

  res.send(`GET /admin/delivery/schedule/${req.params.id}`);
});

// 배송지역 설정 시스템

module.exports = router;

