// routes/admin/boardRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// POST /admin/boards/notices
router.post("/notices", checkAdmin, (req, res) => {
  // TODO: 공지사항 등록
  res.send("POST /admin/boards/notices");
});

// PUT /admin/boards/notices/:id
router.put("/notices/:id", checkAdmin, (req, res) => {
  // TODO: 공지사항 수정
  res.send("PUT /admin/boards/notices/:id");
});

// DELETE /admin/boards/notices/:id
router.delete("/notices/:id", checkAdmin, (req, res) => {
  // TODO: 공지사항 삭제
  res.send("DELETE /admin/boards/notices/:id");
});

// GET /admin/board/inquiries
router.get("/inquiries", checkAdmin, (req, res) => {
  // TODO: 1:1 문의 목록 조회
  res.send("GET /admin/board/inquiries");
});

// GET /admin/board/inquiries/:id
router.get("/inquiries/:id", checkAdmin, (req, res) => {
  // TODO: 1:1 문의 상세 조회
  // id: 1:1 문의 ID

  res.send(`GET /admin/board/inquiries/${req.params.id}`);
});

// PUT /admin/board/inquiries/:id
router.put("/inquiries/:id", checkAdmin, (req, res) => {
  // TODO: 1:1 문의 답변 및 상태 업데이트
  // id: 1:1 문의 ID

  res.send(`PUT /admin/board/inquiries/${req.params.id}`);
});

// POST /adming/board/faqs
router.post("/faqs", checkAdmin, (req, res) => {
  // TODO: FAQ 등록
  res.send("POST /admin/board/faqs");
});

// PUT /admin/board/faqs/:id
router.put("/faqs/:id", checkAdmin, (req, res) => {
  // TODO: FAQ 수정
  res.send(`PUT /admin/board/faqs/${req.params.id}`);
});

// DELETE /admin/board/faqs/:id
router.delete("/faqs/:id", checkAdmin, (req, res) => {
  // TODO: FAQ 삭제
  res.send(`DELETE /admin/board/faqs/${req.params.id}`);
});

// GET /admin/board/customer-voice
router.get("/customer-voice", checkAdmin, (req, res) => {
  // TODO: 고객 의견 목록 조회
  res.send("GET /admin/board/customer-voice");
});

// GET /admin/board/customer-voice/:id
router.get("/customer-voice/:id", checkAdmin, (req, res) => {
  // TODO: 고객 의견 상세 조회
  res.send(`GET /admin/board/customer-voice/${req.params.id}`);
});

module.exports = router;
