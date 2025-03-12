// routes/admin/menuRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// GET /admin/menu
router.get("/", checkAdmin, (req, res) => {
  // TODO: 전체 메뉴 조회
  // 관리자 권한으로 전체 메뉴를 조회하고, 메뉴 정보를 반환
  //
  res.send(`GET /admin/menu`);
});

// POST /admin/menu
router.post("/", checkAdmin, (req, res) => {
  // TODO: 메뉴 생성
  res.send(`POST /admin/menu`);
});

// PUT /admin/menu/:id
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 메뉴 수정
  // 메뉴 ID: ${req.params.id}
  res.send(`PUT /admin/menu/${req.params.id}`);
});

// DELETE /admin/menu/:id
router.delete("/:id", checkAdmin, (req, res) => {
  // TODO: 메뉴 삭제
  // 메뉴 ID: ${req.params.id}
  res.send(`DELETE /admin/menu/${req.params.id}`);
});

module.exports = router;
