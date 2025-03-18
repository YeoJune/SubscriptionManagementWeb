const express = require("express");
const router = express.Router();
const checkAdmin = require("../lib/checkAdmin");
const db = require("../lib/db");

/*
-- 공지 테이블 (notice)
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT
);
*/

// 테이블 생성 확인
db.run(`
  CREATE TABLE IF NOT EXISTS notice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    question TEXT,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// POST /api/notices (admin) - 공지사항 등록
router.post("/", checkAdmin, (req, res) => {
  try {
    const { type, title, content, question, answer } = req.body;

    // 유효성 검사
    if (!type || !title) {
      return res
        .status(400)
        .json({ error: "타입과 제목은 필수 입력 사항입니다." });
    }

    if (type !== "normal" && type !== "faq") {
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    // FAQ 타입인 경우 질문과 답변 필수
    if (type === "faq" && (!question || !answer)) {
      return res
        .status(400)
        .json({ error: "FAQ의 경우 질문과 답변은 필수 입력 사항입니다." });
    }

    // 일반 공지인 경우 내용 필수
    if (type === "normal" && !content) {
      return res
        .status(400)
        .json({ error: "일반 공지의 경우 내용은 필수 입력 사항입니다." });
    }

    // SQL 쿼리 작성
    let query = "";
    let params = [];

    if (type === "normal") {
      query = `INSERT INTO notice (type, title, content) VALUES (?, ?, ?)`;
      params = [type, title, content];
    } else {
      // type === 'faq'
      query = `INSERT INTO notice (type, title, question, answer) VALUES (?, ?, ?, ?)`;
      params = [type, title, question, answer];
    }

    // 데이터베이스에 저장
    db.run(query, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        message:
          type === "normal"
            ? "공지사항이 등록되었습니다."
            : "FAQ가 등록되었습니다.",
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notices/:id (admin) - 공지사항 수정
router.put("/:id", checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, content, question, answer } = req.body;

    // 유효성 검사
    if (!type || !title) {
      return res
        .status(400)
        .json({ error: "타입과 제목은 필수 입력 사항입니다." });
    }

    if (type !== "normal" && type !== "faq") {
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    // FAQ 타입인 경우 질문과 답변 필수
    if (type === "faq" && (!question || !answer)) {
      return res
        .status(400)
        .json({ error: "FAQ의 경우 질문과 답변은 필수 입력 사항입니다." });
    }

    // 일반 공지인 경우 내용 필수
    if (type === "normal" && !content) {
      return res
        .status(400)
        .json({ error: "일반 공지의 경우 내용은 필수 입력 사항입니다." });
    }

    // 해당 공지사항이 존재하는지 확인
    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
      }

      // SQL 쿼리 작성
      let query = "";
      let params = [];

      if (type === "normal") {
        query = `UPDATE notice SET type = ?, title = ?, content = ?, question = NULL, answer = NULL WHERE id = ?`;
        params = [type, title, content, id];
      } else {
        // type === 'faq'
        query = `UPDATE notice SET type = ?, title = ?, content = NULL, question = ?, answer = ? WHERE id = ?`;
        params = [type, title, question, answer, id];
      }

      // 데이터베이스 업데이트
      db.run(query, params, function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: "공지사항 업데이트에 실패했습니다." });
        }

        res.json({
          id: parseInt(id),
          message:
            type === "normal"
              ? "공지사항이 수정되었습니다."
              : "FAQ가 수정되었습니다.",
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notices/:id (admin) - 공지사항 삭제
router.delete("/:id", checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 해당 공지사항이 존재하는지 확인
    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
      }

      // 데이터베이스에서 삭제
      db.run(`DELETE FROM notice WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: "공지사항 삭제에 실패했습니다." });
        }

        res.json({
          message:
            notice.type === "normal"
              ? "공지사항이 삭제되었습니다."
              : "FAQ가 삭제되었습니다.",
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notices - 공지사항 목록 조회
router.get("/", (req, res) => {
  try {
    const { type } = req.query;

    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 타입에 따른 조건 추가
    let whereClause = "";
    let countQuery = `SELECT COUNT(*) as total FROM notice`;
    let query = "";

    if (type) {
      if (type !== "normal" && type !== "faq") {
        return res
          .status(400)
          .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
      }

      whereClause = ` WHERE type = '${type}'`;
      countQuery += whereClause;

      if (type === "normal") {
        query = `SELECT id, type, title, content, created_at FROM notice${whereClause}`;
      } else {
        // type === 'faq'
        query = `SELECT id, type, title, question, answer, created_at FROM notice${whereClause}`;
      }
    } else {
      query = `SELECT id, type, title, content, question, answer, created_at FROM notice`;
    }

    // 정렬 추가 (최신순)
    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    // 전체 공지사항 수 가져오기
    db.get(countQuery, [], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 공지사항 목록 가져오기
      db.all(query, [], (err, notices) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          notices,
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

// GET /api/notices/:id - 특정 공지사항 조회
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;

    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: "공지사항을 찾을 수 없습니다." });
      }

      res.json(notice);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
