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
  delivery_count INTEGER DEFAULT 0,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
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
      'delivery_count',
      'created_at',
      'last_login',
    ];
    let sortBy = req.query.sortBy || 'id';
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'id'; // 기본값으로 설정
    }

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    let query = `SELECT id, name, phone_number, email, address, delivery_count, created_at, last_login FROM users`;
    let countQuery = `SELECT COUNT(*) as total FROM users`;

    const params = [];
    const countParams = [];

    if (searchTerm) {
      const searchCondition = ` WHERE phone_number LIKE ? OR id LIKE ? OR name LIKE ? OR email LIKE ?`;
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

    query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
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

// GET /api/users/:id (admin) - 특정 사용자 정보 조회
router.get('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      `SELECT id, name, phone_number, email, address, delivery_count, created_at, last_login FROM users WHERE id = ?`,
      [id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        res.json(user);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id (admin) - 사용자 정보 수정
router.put('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_count, name, phone_number, email, address, password } =
      req.body;

    // 사용자 존재 여부 확인
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      // 비밀번호 변경이 있는 경우
      if (password) {
        const salt = generateSalt();
        const password_hash = hashPassword(password, salt);

        db.run(
          `UPDATE users SET password_hash = ?, salt = ?, delivery_count = ?, name = ?, phone_number = ?, email = ?, address = ? WHERE id = ?`,
          [
            password_hash,
            salt,
            delivery_count,
            name,
            phone_number,
            email,
            address,
            id,
          ],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: '사용자 업데이트에 실패했습니다.' });
            }

            res.json({
              message: '사용자 정보가 성공적으로 업데이트되었습니다.',
            });
          }
        );
      } else {
        // 비밀번호 변경이 없는 경우
        db.run(
          `UPDATE users SET delivery_count = ?, name = ?, phone_number = ?, email = ?, address = ? WHERE id = ?`,
          [delivery_count, name, phone_number, email, address, id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: '사용자 업데이트에 실패했습니다.' });
            }

            res.json({
              message: '사용자 정보가 성공적으로 업데이트되었습니다.',
            });
          }
        );
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
      delivery_count = 0,
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
            `INSERT INTO users (id, password_hash, salt, delivery_count, name, phone_number, email, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              password_hash,
              salt,
              delivery_count,
              name,
              phone_number,
              email,
              address,
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
