// routes/admin/users.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// GET /admin/users/
router.get("/", checkAdmin, (req, res) => {
  // TODO: 전체 사용자 조회 로직
  res.send("only for admin - get all user information")
})

// GET /admin/users/:id
router.get("/:id", checkAdmin, (req, res) => {
  // TODO: 특정 사용자 조회 로직
  res.send(`관리자 전용 - 사용자 ID: ${req.params.id} 조회`);
});

// POST /admin/users
router.post("/", checkAdmin, (req, res) => {
  // TODO: 사용자 생성 로직
  res.send("관리자 전용 - 사용자 생성");
});

// PUT /admin/users/:id
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 사용자 수정 로직
  res.send(`관리자 전용 - 사용자 ID: ${req.params.id} 수정`);
});

// DELETE /admin/users/:id
router.delete("/:id", checkAdmin, (req, res) => {
  // TODO: 사용자 삭제 로직
  res.send(`관리자 전용 - 사용자 ID: ${req.params.id} 삭제`);
});

module.exports = router;
