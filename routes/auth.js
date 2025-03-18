// routes/auth.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../lib/auth");

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

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  // TODO: 회원가입
  res.send("signup");
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  // TODO: 로그인
  res.send("login");
});

// POST /api/auth/logout
router.post("/logout", authMiddleware, (req, res) => {
  // TODO: 로그아웃
  res.send("logout");
});

// GET /api/auth
router.get("/", authMiddleware, (req, res) => {
  // TODO: 사용자 정보
  res.send("profile");
});

module.exports = router;
