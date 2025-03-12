// routes/admin/paymentsRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// POST /admin/payments/charge
router.post("/charge", checkAdmin, (req, res) => {
  // TODO: 결제 처리 요청
  // 관리자 권한으로 고객의 결제 정보를 받아 결제를 진행하고, 결제 결과를 반환
  // 관리자만 접근 가능

  res.send(`POST /admin/payments/charge`);
});

module.exports = router;


