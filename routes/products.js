// routes/products.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');

/*
-- 상품 테이블 (product)
CREATE TABLE IF NOT EXISTS product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL
);
*/

// GET /api/products - 상품 목록 조회
router.get('/', (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 기능
    const searchTerm = req.query.search || '';

    // 정렬 기능 - 유효한 필드만 허용
    const allowedSortFields = ['name', 'price', 'created_at'];
    let sortBy = req.query.sortBy || 'name';
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'name'; // 기본값으로 설정
    }

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    // 파라미터 배열
    const params = [];
    const countParams = [];

    let query = `SELECT id, name, description, price, created_at FROM product`;
    let countQuery = `SELECT COUNT(*) as total FROM product`;

    if (searchTerm) {
      const searchCondition = ` WHERE name LIKE ? OR description LIKE ?`;
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      countParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 전체 상품 수 가져오기
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 상품 목록 가져오기
      db.all(query, params, (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          products,
          pagination: {
            total: countResult.total,
            currentPage: page,
            totalPages: Math.ceil(countResult.total / limit),
            limit,
          },
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id - 특정 상품 조회
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      `SELECT id, name, description, price FROM product WHERE id = ?`,
      [id],
      (err, product) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!product) {
          return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
        }

        res.json(product);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products (admin) - 상품 등록
router.post('/', checkAdmin, (req, res) => {
  try {
    const { name, description, price } = req.body;

    // 유효성 검사
    if (!name || price === undefined) {
      return res
        .status(400)
        .json({ error: '상품명과 가격은 필수 입력 사항입니다.' });
    }

    // 가격 유효성 검사
    if (isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({ error: '가격은 0 이상의 숫자여야 합니다.' });
    }

    // 데이터베이스에 저장
    db.run(
      `INSERT INTO product (name, description, price) VALUES (?, ?, ?)`,
      [name, description || '', price],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          id: this.lastID,
          message: '상품이 성공적으로 등록되었습니다.',
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id (admin) - 상품 수정
router.put('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price } = req.body;

    // 유효성 검사
    if (!name || price === undefined) {
      return res
        .status(400)
        .json({ error: '상품명과 가격은 필수 입력 사항입니다.' });
    }

    // 가격 유효성 검사
    if (isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({ error: '가격은 0 이상의 숫자여야 합니다.' });
    }

    // 해당 상품이 존재하는지 확인
    db.get(`SELECT * FROM product WHERE id = ?`, [id], (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!product) {
        return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      }

      // 데이터베이스 업데이트
      db.run(
        `UPDATE product SET name = ?, description = ?, price = ? WHERE id = ?`,
        [name, description || '', price, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res
              .status(404)
              .json({ error: '상품 업데이트에 실패했습니다.' });
          }

          res.json({
            id: parseInt(id),
            message: '상품이 성공적으로 수정되었습니다.',
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id (admin) - 상품 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 해당 상품이 존재하는지 확인
    db.get(`SELECT * FROM product WHERE id = ?`, [id], (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!product) {
        return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      }

      // 데이터베이스에서 삭제
      db.run(`DELETE FROM product WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '상품 삭제에 실패했습니다.' });
        }

        res.json({
          message: '상품이 성공적으로 삭제되었습니다.',
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
