// routes/inquiry.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const { authMiddleware } = require('../lib/auth');
const db = require('../lib/db');

/*
-- 고객의 소리 테이블 (inquiries)
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP
);
*/

// GET /api/inquiries - 고객의 소리 목록 조회
router.get('/', authMiddleware, (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 상태 필터링
    const { status } = req.query;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    let query = `
      SELECT i.id, i.user_id, u.name as user_name, i.title, i.content, i.answer, i.status, i.created_at, i.answered_at
      FROM inquiries i
      JOIN users u ON i.user_id = u.id
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM inquiries i
      JOIN users u ON i.user_id = u.id
    `;

    const params = [];
    const countParams = [];
    let conditions = [];

    // 관리자가 아닌 경우 자신의 문의만 조회 가능
    if (!isAdmin) {
      conditions.push('i.user_id = ?');
      params.push(userId);
      countParams.push(userId);
    }

    // 상태 필터링이 있는 경우
    if (status && (status === 'answered' || status === 'unanswered')) {
      conditions.push('i.status = ?');
      params.push(status);
      countParams.push(status);
    }

    // 조건 추가
    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // 정렬 및 페이지네이션 추가
    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 전체 문의 수 조회
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 문의 목록 조회
      db.all(query, params, (err, inquiries) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          inquiries,
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

// GET /api/inquiries/:id - 특정 문의 조회
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    let query = `
      SELECT i.id, i.user_id, u.name as user_name, i.title, i.content, i.answer, i.status, i.created_at, i.answered_at
      FROM inquiries i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `;

    const params = [id];

    // 관리자가 아닌 경우 자신의 문의만 조회 가능
    if (!isAdmin) {
      query += ` AND i.user_id = ?`;
      params.push(userId);
    }

    db.get(query, params, (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      res.json(inquiry);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inquiries - 문의 등록
router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.session.user.id;

    // 유효성 검사
    if (!title || !content) {
      return res
        .status(400)
        .json({ error: '제목과 내용은 필수 입력 사항입니다.' });
    }

    // 데이터베이스에 저장
    db.run(
      `INSERT INTO inquiries (user_id, title, content, status) VALUES (?, ?, ?, 'unanswered')`,
      [userId, title, content],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          id: this.lastID,
          message: '문의가 등록되었습니다.',
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inquiries/:id - 문의 답변 등록/수정 (관리자 전용)
router.put('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    // 유효성 검사
    if (!answer) {
      return res.status(400).json({ error: '답변은 필수 입력 사항입니다.' });
    }

    // 해당 문의가 존재하는지 확인
    db.get(`SELECT * FROM inquiries WHERE id = ?`, [id], (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      // 답변 등록/수정
      db.run(
        `UPDATE inquiries SET answer = ?, status = 'answered', answered_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [answer, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '답변 등록에 실패했습니다.' });
          }

          res.json({
            id: parseInt(id),
            message: '답변이 등록되었습니다.',
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
