// routes/notices.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");

/*
-- 공지 테이블 (notice)
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT
);
*/

// POST /api/notices (admin)
router.post("/", checkAdmin, (req, res) => {
  // TODO: 공지사항 등록
  res.send("POST /api/notices");
});

// PUT /api/notices/:id (admin)
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 공지사항 수정
  res.send("PUT /api/notices/:id");
});

// DELETE /api/notices/:id (admin)
router.delete("/:id", checkAdmin, (req, res) => {
  // TODO: 공지사항 삭제
  res.send("DELETE /api/notices/:id");
});

// GET /api/notices
router.get("/", (req, res) => {
  // TODO: 공지사항 보기
  const { type } = req.query;
  res.send(`GET /api/notices?type=${type}`);
});

module.exports = router;
