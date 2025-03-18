// routes/delivery.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");

/*

-- 배달 목록 테이블 (delivery_list)
CREATE TABLE IF NOT EXISTS delivery_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL,
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL
);

*/

// GET /api/delivery (admin)
router.get("/", checkAdmin, (req, res) => {
  // TODO: 배달 목록
  res.send("GET /api/delivery");
});

// UPDATE /api/delivery/:id (admin)
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 배달 상태 변경
  const { status } = req.body;
  res.send(`PUT /api/delivery/:id ${status}`);
});

module.exports = router;
