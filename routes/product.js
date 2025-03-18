// routes/product.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");

/*

-- 상품 테이블 (product)
CREATE TABLE IF NOT EXISTS product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL
);
*/

// GET /api/products
router.get("/", (req, res) => {
  // TODO: 상품 목록
  res.send("GET /api/products");
});

// POST /api/products (admin)
router.post("/", checkAdmin, (req, res) => {
  // TODO: 상품 등록
  res.send("POST /api/products");
});

// PUT /api/products/:id (admin)
router.put("/:id", checkAdmin, (req, res) => {
  // TODO: 상품 수정
  res.send("PUT /api/products/:id");
});

// DELETE /api/products/:id (admin)
router.delete("/:id", checkAdmin, (req, res) => {
  // TODO: 상품 삭제
  res.send("DELETE /api/products/:id");
});

module.exports = router;
