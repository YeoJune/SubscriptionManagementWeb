// routes/admin/statisticsRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// GET /admin/statistics/users/:userid 
router.get("/users/:userid", checkAdmin, (req, res) => {
  // TODO: implement user statistics

  res.send(`admin only - user statistics: ${req.params.userid}`);
});

// GET /admin/statistics/sales
router.get("/sales", checkAdmin, (req, res) => {
  // TODO: implement sales statistics
  //
  res.send("admin only - sales statistics");
});

// GET /admin/statistics/delivery
router.get("/delivery", checkAdmin, (req, res) => {
  // TODO: 배송 관련 통계 조회
  res.send("admin only - delivery statistics");
});

moudles.exports = router;

