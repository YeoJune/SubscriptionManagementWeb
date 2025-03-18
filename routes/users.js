// routes/users.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");

/*
-- 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  delivery_count INTEGER DEFAULT 0,
  phone_number TEXT
);
*/

// GET /api/users (admin)
router.get("/", checkAdmin, (req, res) => {
  // TODO: 사용자 목록
  res.send("GET /api/users");
});

// GET /api/users/:id (admin)
router.get("/:id", checkAdmin, (req, res) => {
  // TODO: 사용자 정보
  res.send("GET /api/users/:id");
});

// PUT /api/users/:id (admin)
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 사용자 정보 수정
  res.send("PUT /api/users/:id");
});

// DELETE /api/users/:id (admin)
router.delete("/:id", checkAdmin, (req, res) => {
  // TODO: 사용자 정보 삭제
  res.send("DELETE /api/users/:id");
});

module.exports = router;
