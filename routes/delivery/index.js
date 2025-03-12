// routes/delivery/index.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../../lib/auth");

// GET /delivery/schedule
router.get("/schedule", authMiddleware, (req, res) => {
  // TODO: 배송 일정 조회
  // 고객의 배송 일정을 조회하고, 배송 일정을 반환
  res.send(`GET /delivery/schedule`);
});

module.exports = router;

