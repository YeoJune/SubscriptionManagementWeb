// routes/board/index.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../lib/auth");

// GET /board/notices
router.get("/notices", (req, res) => {
  // TODO: 공지사항 목록 조회
  res.send("GET /board/notices");
});

// GET /board/inquiries
router.get("/inquiries", authMiddleware, (req, res) => {
  // TODO: 1:1 문의 목록 조회
  // authMiddleware를 사용하여 로그인 여부 확인
  // 로그인하지 않은 경우, 401 Unauthorized 에러 발생
  // 로그인한 경우, 1:1 문의 목록 조회
  // authMiddleware는 lib/auth.js에 구현되어 있음

  res.send("GET /board/inquiries");
});

// POST /board/inquiries
router.post("/inquiries", authMiddleware, (req, res) => {
  // TODO: 1:1 문의 등록
  // authMiddleware를 사용하여 로그인 여부 확인
  // 로그인하지 않은 경우, 401 Unauthorized 에러 발생
  // 로그인한 경우, 1:1 문의 등록
  // authMiddleware는 lib/auth.js에 구현되어 있음

  res.send("POST /board/inquiries");
});

// GET /board/faqs
router.get("/faqs", (req, res) => {
  // TODO: FAQ 목록 조회
  res.send("GET /board/faqs");
});

// POST /board/customer-voice
router.post("/customer-voice", (req, res) => {
  // TODO: 고객 의견 등록
  // NOTE: QR 코드를 통해 고객이 피드백 남기는 것 요구사항...

  res.send("POST /board/customer-voice");
});

module.exports = router;

