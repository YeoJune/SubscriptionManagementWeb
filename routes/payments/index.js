// routes/payments/index.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../lib/auth");

// POST /payments/charge
router.post("/charge", authMiddleware, (req, res) => {
  // TODO: 결제 처리 요청
  // 고객의 결제 정보를 받아 결제를 진행하고, 결제 결과를 반환
  res.send(`POST /payments/charge`);
});

// POST /payments/refund
router.post("/refund", authMiddleware, (req, res) => {
  // TODO: 환불 처리 요청
  // 고객의 환불 요청을 받아 환불을 진행하고, 환불 결과를 반환
  res.send(`POST /payments/refund`);
});

// GET /payments/history
router.post("/history", authMiddleware, (req, res) => {
  // TODO: 결제 내역 조회
  // 고객의 결제 내역을 조회하고, 결제 내역을 반환
  
  res.send(`GET /payments/history`);
});

module.exports = router;

