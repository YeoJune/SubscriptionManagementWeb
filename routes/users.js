// routes/users.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');
const { hashPassword, generateSalt } = require('../lib/auth');

/*
-- 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  total_delivery_count INTEGER DEFAULT 0,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  card_payment_allowed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
*/

// GET /api/users (admin) - 사용자 목록 조회
router.get('/', checkAdmin, (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 기능
    const searchTerm = req.query.search || '';

    // 정렬 기능 - 유효한 필드만 허용
    const allowedSortFields = [
      'id',
      'name',
      'phone_number',
      'email',
      'total_delivery_count',
      'created_at',
      'last_login',
    ];
    let sortBy = req.query.sortBy || 'id';
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'id'; // 기본값으로 설정
    }

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    // 🔧 수정된 쿼리 - 서브쿼리를 사용하여 정확한 계산
    let query = `
      SELECT 
        u.id, u.name, u.phone_number, u.email, u.address, u.total_delivery_count, u.card_payment_allowed, u.created_at, u.last_login,
        COALESCE(remaining_summary.total_remaining_deliveries, 0) as total_remaining_deliveries,
        COALESCE(delivery_summary.pending_deliveries, 0) as pending_deliveries,
        COALESCE(delivery_summary.completed_deliveries, 0) as completed_deliveries
      FROM users u
      LEFT JOIN (
        SELECT 
          user_id,
          SUM(remaining_count) as total_remaining_deliveries
        FROM user_product_delivery 
        GROUP BY user_id
      ) remaining_summary ON u.id = remaining_summary.user_id
      LEFT JOIN (
        SELECT 
          user_id,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deliveries,
          COUNT(CASE WHEN status = 'complete' THEN 1 END) as completed_deliveries
        FROM delivery_list 
        GROUP BY user_id
      ) delivery_summary ON u.id = delivery_summary.user_id
    `;

    let countQuery = `SELECT COUNT(*) as total FROM users u`;

    const params = [];
    const countParams = [];

    if (searchTerm) {
      const searchCondition = ` WHERE (u.phone_number LIKE ? OR u.id LIKE ? OR COALESCE(u.name, '') LIKE ? OR COALESCE(u.email, '') LIKE ?)`;
      query += searchCondition;
      countQuery += searchCondition;

      const searchPattern = `%${searchTerm}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      countParams.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    query += ` ORDER BY u.${sortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 전체 사용자 수 가져오기
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 사용자 목록 가져오기
      db.all(query, params, (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          users: rows,
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

// GET /api/users/:id - 특정 사용자 정보 조회 (관리자 또는 본인)
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 인증 확인
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const currentUser = req.session.user;
    const isAdmin = currentUser.isAdmin;
    const isOwner = currentUser.id === id;

    // 관리자이거나 본인인 경우만 허용
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 사용자 기본 정보
    db.get(
      `SELECT id, name, phone_number, email, address, card_payment_allowed, created_at, last_login FROM users WHERE id = ?`,
      [id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        // 상품별 배송 횟수도 함께 조회
        db.all(
          `SELECT upd.product_id, p.name as product_name, upd.remaining_count
           FROM user_product_delivery upd
           JOIN product p ON upd.product_id = p.id
           WHERE upd.user_id = ?
           ORDER BY p.name ASC`,
          [id],
          (err, products) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // 전체 남은 배송 횟수 계산
            const totalDeliveryCount = products.reduce(
              (sum, p) => sum + p.remaining_count,
              0
            );

            // 사용자 정보와 상품별 배송 횟수 반환
            res.json({
              ...user,
              total_delivery_count: totalDeliveryCount,
              product_deliveries: products,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id - 사용자 정보 수정 (관리자 또는 본인)
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone_number,
      email,
      address,
      password,
      product_deliveries,
      card_payment_allowed,
    } = req.body;

    // 인증 확인
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: '로그인이 필요합니다.' });
    }

    const currentUser = req.session.user;
    const isAdmin = currentUser.isAdmin;
    const isOwner = currentUser.id === id;

    // 관리자이거나 본인인 경우만 허용
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }

    // 트랜잭션 시작
    db.run('BEGIN TRANSACTION', async (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      try {
        // 1. 사용자 기본 정보 업데이트
        if (password) {
          // 비밀번호 변경이 있는 경우
          const salt = generateSalt();
          const password_hash = hashPassword(password, salt);

          await new Promise((resolve, reject) => {
            const updateQuery =
              isAdmin && card_payment_allowed !== undefined
                ? `UPDATE users SET password_hash = ?, salt = ?, name = ?, phone_number = ?, email = ?, address = ?, card_payment_allowed = ? WHERE id = ?`
                : `UPDATE users SET password_hash = ?, salt = ?, name = ?, phone_number = ?, email = ?, address = ? WHERE id = ?`;

            const updateParams =
              isAdmin && card_payment_allowed !== undefined
                ? [
                    password_hash,
                    salt,
                    name,
                    phone_number,
                    email,
                    address,
                    card_payment_allowed ? 1 : 0,
                    id,
                  ]
                : [password_hash, salt, name, phone_number, email, address, id];

            db.run(updateQuery, updateParams, function (err) {
              if (err) reject(err);
              else resolve();
            });
          });
        } else {
          // 비밀번호 변경이 없는 경우
          const updateQuery =
            isAdmin && card_payment_allowed !== undefined
              ? `UPDATE users SET name = ?, phone_number = ?, email = ?, address = ?, card_payment_allowed = ? WHERE id = ?`
              : `UPDATE users SET name = ?, phone_number = ?, email = ?, address = ? WHERE id = ?`;

          const updateParams =
            isAdmin && card_payment_allowed !== undefined
              ? [
                  name,
                  phone_number,
                  email,
                  address,
                  card_payment_allowed ? 1 : 0,
                  id,
                ]
              : [name, phone_number, email, address, id];

          await new Promise((resolve, reject) => {
            db.run(updateQuery, updateParams, function (err) {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        // 2. 상품별 배송 횟수 업데이트 (관리자만 가능)
        if (product_deliveries && Array.isArray(product_deliveries)) {
          if (!isAdmin) {
            throw new Error('상품별 배송 횟수는 관리자만 수정할 수 있습니다.');
          }

          for (const item of product_deliveries) {
            const { product_id, remaining_count } = item;

            await new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
                 VALUES (?, ?, ?)
                 ON CONFLICT(user_id, product_id) 
                 DO UPDATE SET remaining_count = ?, updated_at = CURRENT_TIMESTAMP`,
                [id, product_id, remaining_count, remaining_count],
                function (err) {
                  if (err) reject(err);
                  else resolve();
                }
              );
            });
          }
        }

        // 트랜잭션 커밋
        db.run('COMMIT', (err) => {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: '사용자 정보가 성공적으로 업데이트되었습니다.' });
        });
      } catch (error) {
        db.run('ROLLBACK');
        res.status(500).json({ error: error.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/users/:id (admin) - 사용자 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      res.json({ message: '사용자가 성공적으로 삭제되었습니다.' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users (admin) - 새 사용자 추가
router.post('/', checkAdmin, (req, res) => {
  try {
    const {
      id,
      password,
      name,
      phone_number,
      email,
      address,
      total_delivery_count = 0,
      card_payment_allowed = false,
    } = req.body;

    if (!id || !password || !phone_number) {
      return res
        .status(400)
        .json({ error: '아이디, 비밀번호, 전화번호는 필수 입력 사항입니다.' });
    }

    // ID 중복 확인
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
      }

      // 전화번호 중복 확인
      db.get(
        `SELECT * FROM users WHERE phone_number = ?`,
        [phone_number],
        (err, phoneUser) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (phoneUser) {
            return res
              .status(400)
              .json({ error: '이미 등록된 전화번호입니다.' });
          }

          // 새 사용자 생성
          const salt = generateSalt();
          const password_hash = hashPassword(password, salt);

          db.run(
            `INSERT INTO users (id, password_hash, salt, total_delivery_count, name, phone_number, email, address, card_payment_allowed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              password_hash,
              salt,
              total_delivery_count,
              name,
              phone_number,
              email,
              address,
              card_payment_allowed ? 1 : 0,
            ],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.status(201).json({
                id: id,
                message: '사용자가 성공적으로 생성되었습니다.',
              });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
