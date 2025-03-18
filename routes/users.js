const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");
const db = require("../lib/db");
const { hashPassword, verifyPassword, generateSalt } = require("../lib/auth");

/*
-- 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  delivery_count INTEGER DEFAULT 0,
  phone_number TEXT
);
*/

// GET /api/users (admin) - 사용자 목록 조회
router.get("/", checkAdmin, (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 기능
    const searchTerm = req.query.search || "";

    // 정렬 기능
    const sortBy = req.query.sortBy || "id";
    const order = req.query.order === "desc" ? "DESC" : "ASC";

    let query = `SELECT id, delivery_count, phone_number FROM users`;
    let countQuery = `SELECT COUNT(*) as total FROM users`;

    if (searchTerm) {
      const searchCondition = ` WHERE phone_number LIKE '%${searchTerm}%' OR id LIKE '%${searchTerm}%'`;
      query += searchCondition;
      countQuery += searchCondition;
    }

    query += ` ORDER BY ${sortBy} ${order} LIMIT ${limit} OFFSET ${offset}`;

    // 전체 사용자 수 가져오기
    db.get(countQuery, [], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 사용자 목록 가져오기
      db.all(query, [], (err, rows) => {
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
router.get("/:id", checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      `SELECT id, delivery_count, phone_number FROM users WHERE id = ?`,
      [id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
        }

        res.json(user);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/users/:id (admin) - 사용자 정보 수정
router.put("/:id", checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_count, phone_number, password } = req.body;

    // 사용자 존재 여부 확인
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      // 비밀번호 변경이 있는 경우
      if (password) {
        const salt = generateSalt();
        const password_hash = hashPassword(password, salt);

        db.run(
          `UPDATE users SET password_hash = ?, salt = ?, delivery_count = ?, phone_number = ? WHERE id = ?`,
          [password_hash, salt, delivery_count, phone_number, id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: "사용자 업데이트에 실패했습니다." });
            }

            res.json({
              message: "사용자 정보가 성공적으로 업데이트되었습니다.",
            });
          }
        );
      } else {
        // 비밀번호 변경이 없는 경우
        db.run(
          `UPDATE users SET delivery_count = ?, phone_number = ? WHERE id = ?`,
          [delivery_count, phone_number, id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
              return res
                .status(404)
                .json({ error: "사용자 업데이트에 실패했습니다." });
            }

            res.json({
              message: "사용자 정보가 성공적으로 업데이트되었습니다.",
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
router.delete("/:id", checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
      }

      res.json({ message: "사용자가 성공적으로 삭제되었습니다." });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users (admin) - 새 사용자 추가
router.post("/", checkAdmin, (req, res) => {
  try {
    const { id, password, phone_number, delivery_count = 0 } = req.body;

    if (!id || !password || !phone_number) {
      return res
        .status(400)
        .json({ error: "아이디, 비밀번호, 전화번호는 필수 입력 사항입니다." });
    }

    // ID 중복 확인
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ error: "이미 사용 중인 아이디입니다." });
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
              .json({ error: "이미 등록된 전화번호입니다." });
          }

          // 새 사용자 생성
          const salt = generateSalt();
          const password_hash = hashPassword(password, salt);

          db.run(
            `INSERT INTO users (id, password_hash, salt, delivery_count, phone_number) VALUES (?, ?, ?, ?, ?)`,
            [id, password_hash, salt, delivery_count, phone_number],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.status(201).json({
                id: id,
                message: "사용자가 성공적으로 생성되었습니다.",
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
