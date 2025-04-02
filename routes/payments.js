// routes/payments.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authMiddleware } = require('../lib/auth');
const deliveryManager = require('../lib/deliveryManager');

/*
-- 결제 테이블 (payments)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  count INTEGER NOT NULL,
  amount REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// routes/payments.js의 결제 처리 (POST /api/payments)
router.post('/', authMiddleware, (req, res) => {
  try {
    const { product_id } = req.body;
    const user_id = req.session.user.id;

    // 유효성 검사
    if (!product_id) {
      return res.status(400).json({ error: '상품은 필수 입력 사항입니다.' });
    }

    // 상품 정보 확인
    db.get(
      `SELECT * FROM product WHERE id = ?`,
      [product_id],
      (err, product) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!product) {
          return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
        }

        // 결제 금액 계산 (상품 가격)
        const amount = product.price;

        // 상품에 포함된 배송 횟수
        const deliveryCount = product.delivery_count;

        // 항상 count는 1로 고정 (수량 개념 없음)
        const count = 1;

        // 트랜잭션 시작
        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // 결제 정보 저장
          db.run(
            `INSERT INTO payments (user_id, product_id, count, amount) VALUES (?, ?, ?, ?)`,
            [user_id, product_id, count, amount],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              const payment_id = this.lastID;

              // 사용자별 상품 배송 잔여 횟수 업데이트
              db.run(
                `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id, product_id) 
                 DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
                [user_id, product_id, deliveryCount, deliveryCount],
                function (err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                  }

                  // 트랜잭션 커밋
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: err.message });
                    }

                    // 배송 일정 생성 (트랜잭션 외부에서)
                    deliveryManager
                      .createDeliverySchedule(
                        user_id,
                        product_id,
                        deliveryCount
                      )
                      .then((deliveries) => {
                        res.status(201).json({
                          message: '결제 및 배송 일정 등록이 완료되었습니다.',
                          payment_id,
                          amount,
                          delivery_count: deliveryCount,
                          deliveries,
                        });
                      })
                      .catch((error) => {
                        res.status(500).json({ error: error.message });
                      });
                  });
                }
              );
            }
          );
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/payments - 사용자 결제 내역 조회 (로그인 필요)
router.get('/', authMiddleware, (req, res) => {
  try {
    const user_id = req.session.user.id;

    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 사용자의 결제 내역 조회
    const query = `
      SELECT p.id, p.product_id, p.count, p.amount, p.created_at, 
             pr.name as product_name, pr.delivery_count as product_delivery_count
      FROM payments p
      JOIN product pr ON p.product_id = pr.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments
      WHERE user_id = ?
    `;

    // 전체 결제 내역 수 조회
    db.get(countQuery, [user_id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 결제 내역 조회
      db.all(query, [user_id, limit, offset], (err, payments) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          payments,
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

module.exports = router;
