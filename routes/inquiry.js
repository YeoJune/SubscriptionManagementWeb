// routes/inquiry.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const { authMiddleware } = require('../lib/auth');
const db = require('../lib/db');

/*
-- 고객의 소리 테이블 (inquiries) - 결제 관련 컬럼 추가됨
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  category TEXT CHECK(category IN ('general', 'catering')) NOT NULL DEFAULT 'general',
  status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
  payment_requested BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  payment_requested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP
);
*/

// GET /api/inquiries - 고객의 소리 목록 조회 (기존 코드 유지)
router.get('/', authMiddleware, (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 상태 필터링, 카테고리 필터링 및 검색
    const { status, search, category } = req.query;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    let query = `
      SELECT i.id, i.user_id, u.name as user_name, i.title, i.content, i.answer, i.status, 
             i.created_at, i.answered_at, i.payment_requested, i.payment_amount, i.payment_requested_at
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

    // 카테고리 필터링이 있는 경우
    if (category && (category === 'general' || category === 'catering')) {
      conditions.push('i.category = ?');
      params.push(category);
      countParams.push(category);
    }

    // 검색어가 있는 경우
    if (search) {
      conditions.push('(i.title LIKE ? OR i.content LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern);
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

// GET /api/inquiries/:id - 특정 문의 조회 (기존 코드 유지)
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    let query = `
      SELECT i.id, i.user_id, u.name as user_name, i.title, i.content, i.answer, i.status, 
             i.created_at, i.answered_at, i.payment_requested, i.payment_amount, i.payment_requested_at
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

// POST /api/inquiries - 문의 등록 (기존 코드 유지)
router.post('/', authMiddleware, (req, res) => {
  try {
    const { title, content, category } = req.body;
    const userId = req.session.user.id;

    // 유효성 검사
    if (!title || !content) {
      return res
        .status(400)
        .json({ error: '제목과 내용은 필수 입력 사항입니다.' });
    }

    // 카테고리 유효성 검사
    const validCategory = category === 'catering' ? 'catering' : 'general';

    // 데이터베이스에 저장
    db.run(
      `INSERT INTO inquiries (user_id, title, content, category, status) VALUES (?, ?, ?, ?, 'unanswered')`,
      [userId, title, content, validCategory],
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

// 🆕 PUT /api/inquiries/:id/request-payment - 문의 답변 + 결제 요청 (관리자 전용)
router.put('/:id/request-payment', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { answer, payment_amount } = req.body;

    // 유효성 검사
    if (!answer) {
      return res.status(400).json({ error: '답변은 필수 입력 사항입니다.' });
    }

    if (!payment_amount || payment_amount <= 0) {
      return res
        .status(400)
        .json({ error: '올바른 결제 금액을 입력해주세요.' });
    }

    // 해당 문의가 존재하는지 확인
    db.get(`SELECT * FROM inquiries WHERE id = ?`, [id], (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      // 답변 + 결제 요청 등록
      db.run(
        `UPDATE inquiries SET 
         answer = ?, 
         status = 'answered', 
         answered_at = CURRENT_TIMESTAMP,
         payment_requested = TRUE,
         payment_amount = ?,
         payment_requested_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [answer, payment_amount, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '답변 등록에 실패했습니다.' });
          }

          res.json({
            id: parseInt(id),
            message: '답변 및 결제 요청이 등록되었습니다.',
            payment_requested: true,
            payment_amount: payment_amount,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/inquiries/:id/answer - 문의 답변 등록/수정 (관리자 전용) - 기존 코드 유지
router.put('/:id/answer', checkAdmin, (req, res) => {
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

// PUT /api/inquiries/:id - 문의 수정 (작성자 또는 관리자) - 기존 코드 유지
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    // 유효성 검사
    if (!title || !content) {
      return res
        .status(400)
        .json({ error: '제목과 내용은 필수 입력 사항입니다.' });
    }

    // 해당 문의가 존재하는지 확인 및 권한 체크
    db.get(`SELECT * FROM inquiries WHERE id = ?`, [id], (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      // 권한 확인: 작성자 본인이거나 관리자만 수정 가능
      if (!isAdmin && inquiry.user_id !== userId) {
        return res.status(403).json({ error: '수정 권한이 없습니다.' });
      }

      // 문의 수정
      db.run(
        `UPDATE inquiries SET title = ?, content = ? WHERE id = ?`,
        [title, content, id],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          if (this.changes === 0) {
            return res.status(404).json({ error: '문의 수정에 실패했습니다.' });
          }

          res.json({
            id: parseInt(id),
            message: '문의가 수정되었습니다.',
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/inquiries/:id - 문의 삭제 (작성자 또는 관리자) - 기존 코드 유지
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    // 해당 문의가 존재하는지 확인 및 권한 체크
    db.get(`SELECT * FROM inquiries WHERE id = ?`, [id], (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      // 권한 확인: 작성자 본인이거나 관리자만 삭제 가능
      if (!isAdmin && inquiry.user_id !== userId) {
        return res.status(403).json({ error: '삭제 권한이 없습니다.' });
      }

      // 문의 삭제
      db.run(`DELETE FROM inquiries WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '문의 삭제에 실패했습니다.' });
        }

        res.json({
          id: parseInt(id),
          message: '문의가 삭제되었습니다.',
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inquiries/:id/payment-status - 특정 문의의 결제 상태 조회 (관리자 전용)
router.get('/:id/payment-status', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.isAdmin;

    // 문의 정보 조회
    let inquiryQuery = `
      SELECT i.*, u.name as user_name
      FROM inquiries i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `;

    const inquiryParams = [id];

    // 관리자가 아닌 경우 자신의 문의만 조회 가능
    if (!isAdmin) {
      inquiryQuery += ` AND i.user_id = ?`;
      inquiryParams.push(userId);
    }

    db.get(inquiryQuery, inquiryParams, (err, inquiry) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!inquiry) {
        return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      }

      // 해당 문의의 결제 정보 조회
      db.get(
        `SELECT * FROM payments WHERE product_id = ? ORDER BY created_at DESC LIMIT 1`,
        [-inquiry.id], // product_id가 -inquiry_id인 결제 찾기
        (err, payment) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          const paymentStatus = payment
            ? {
                id: payment.id,
                order_id: payment.order_id,
                status: payment.status,
                amount: payment.amount,
                payment_method: payment.payment_method,
                depositor_name: payment.depositor_name,
                paid_at: payment.paid_at,
                created_at: payment.created_at,
              }
            : null;

          res.json({
            inquiry: {
              id: inquiry.id,
              user_id: inquiry.user_id,
              user_name: inquiry.user_name,
              title: inquiry.title,
              content: inquiry.content,
              answer: inquiry.answer,
              status: inquiry.status,
              payment_requested: inquiry.payment_requested,
              payment_amount: inquiry.payment_amount,
              payment_requested_at: inquiry.payment_requested_at,
              created_at: inquiry.created_at,
              answered_at: inquiry.answered_at,
            },
            payment: paymentStatus,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
