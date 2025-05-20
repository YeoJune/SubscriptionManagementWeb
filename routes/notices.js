// routes/notices.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/*
-- 공지 테이블 (notice) - 이미지 필드 추가
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT,
  image_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// multer 설정 - 이미지 업로드를 위한 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/notices');

    // 디렉토리가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 파일명 중복 방지를 위해 타임스탬프 추가
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'notice-' + uniqueSuffix + ext);
  },
});

// 이미지 파일 필터링
const fileFilter = (req, file, cb) => {
  // 허용할 이미지 타입
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('지원되지 않는 파일 형식입니다. (jpg, jpeg, png, gif만 허용)'),
      false
    );
  }
};

// multer 업로드 객체 생성
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
});

// POST /api/notices (admin) - 공지사항 등록 (이미지 포함)
router.post('/', checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { type, title, content, question, answer } = req.body;
    const imagePath = req.file
      ? `/public/uploads/notices/${req.file.filename}`
      : null;

    // 유효성 검사
    if (!type || !title) {
      // 업로드된 이미지가 있으면 삭제
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '타입과 제목은 필수 입력 사항입니다.' });
    }

    if (type !== 'normal' && type !== 'faq') {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    // FAQ 타입인 경우 질문과 답변 필수
    if (type === 'faq' && (!question || !answer)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: 'FAQ의 경우 질문과 답변은 필수 입력 사항입니다.' });
    }

    // 일반 공지인 경우 내용 필수
    if (type === 'normal' && !content) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '일반 공지의 경우 내용은 필수 입력 사항입니다.' });
    }

    // SQL 쿼리 작성
    let query = '';
    let params = [];

    if (type === 'normal') {
      query = `INSERT INTO notice (type, title, content, image_path) VALUES (?, ?, ?, ?)`;
      params = [type, title, content, imagePath];
    } else {
      // type === 'faq'
      query = `INSERT INTO notice (type, title, question, answer, image_path) VALUES (?, ?, ?, ?, ?)`;
      params = [type, title, question, answer, imagePath];
    }

    // 데이터베이스에 저장
    db.run(query, params, function (err) {
      if (err) {
        // 오류 발생 시 업로드된 이미지 삭제
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        image_path: imagePath,
        message:
          type === 'normal'
            ? '공지사항이 등록되었습니다.'
            : 'FAQ가 등록되었습니다.',
      });
    });
  } catch (error) {
    // 오류 발생 시 업로드된 이미지 삭제
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notices/:id (admin) - 공지사항 수정 (이미지 포함)
router.put('/:id', checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, content, question, answer, removeImage } = req.body;
    const newImagePath = req.file
      ? `/public/uploads/notices/${req.file.filename}`
      : null;

    // 유효성 검사
    if (!type || !title) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '타입과 제목은 필수 입력 사항입니다.' });
    }

    if (type !== 'normal' && type !== 'faq') {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    // FAQ 타입인 경우 질문과 답변 필수
    if (type === 'faq' && (!question || !answer)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: 'FAQ의 경우 질문과 답변은 필수 입력 사항입니다.' });
    }

    // 일반 공지인 경우 내용 필수
    if (type === 'normal' && !content) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '일반 공지의 경우 내용은 필수 입력 사항입니다.' });
    }

    // 해당 공지사항이 존재하는지 확인
    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      // 이전 이미지 경로 저장
      const oldImagePath = notice.image_path;

      // 이미지 처리 로직
      let finalImagePath = oldImagePath;

      // 이미지 제거 요청이 있는 경우
      if (removeImage === 'true' || removeImage === true) {
        finalImagePath = null;
        // 이전 이미지 파일 삭제
        if (oldImagePath) {
          const fullPath = path.join(__dirname, '../public', oldImagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // 새 이미지가 업로드된 경우
      if (newImagePath) {
        finalImagePath = newImagePath;
        // 이전 이미지 파일 삭제
        if (oldImagePath) {
          const fullPath = path.join(__dirname, '../public', oldImagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }

      // SQL 쿼리 작성
      let query = '';
      let params = [];

      if (type === 'normal') {
        query = `UPDATE notice SET type = ?, title = ?, content = ?, question = NULL, answer = NULL, image_path = ? WHERE id = ?`;
        params = [type, title, content, finalImagePath, id];
      } else {
        // type === 'faq'
        query = `UPDATE notice SET type = ?, title = ?, content = NULL, question = ?, answer = ?, image_path = ? WHERE id = ?`;
        params = [type, title, question, answer, finalImagePath, id];
      }

      // 데이터베이스 업데이트
      db.run(query, params, function (err) {
        if (err) {
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }
          return res
            .status(404)
            .json({ error: '공지사항 업데이트에 실패했습니다.' });
        }

        res.json({
          id: parseInt(id),
          image_path: finalImagePath,
          message:
            type === 'normal'
              ? '공지사항이 수정되었습니다.'
              : 'FAQ가 수정되었습니다.',
        });
      });
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notices/:id (admin) - 공지사항 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 해당 공지사항이 존재하는지 확인
    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      // 이미지 파일이 있으면 삭제
      if (notice.image_path) {
        const fullPath = path.join(__dirname, '../public', notice.image_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // 데이터베이스에서 삭제
      db.run(`DELETE FROM notice WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: '공지사항 삭제에 실패했습니다.' });
        }

        res.json({
          message:
            notice.type === 'normal'
              ? '공지사항이 삭제되었습니다.'
              : 'FAQ가 삭제되었습니다.',
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notices - 공지사항 목록 조회
router.get('/', (req, res) => {
  try {
    const { type } = req.query;

    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 타입에 따른 조건 추가
    let whereClause = '';
    let params = [];
    let countQuery = `SELECT COUNT(*) as total FROM notice`;
    let query = '';

    if (type) {
      if (type !== 'normal' && type !== 'faq') {
        return res
          .status(400)
          .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
      }

      whereClause = ` WHERE type = ?`;
      params.push(type);
      countQuery += whereClause;

      if (type === 'normal') {
        query = `SELECT id, type, title, content, image_path, created_at FROM notice${whereClause}`;
      } else {
        // type === 'faq'
        query = `SELECT id, type, title, question, answer, image_path, created_at FROM notice${whereClause}`;
      }
    } else {
      query = `SELECT id, type, title, content, question, answer, image_path, created_at FROM notice`;
    }

    // 정렬 추가 (최신순)
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 전체 공지사항 수 가져오기
    db.get(
      countQuery,
      params.slice(0, params.length - 2),
      (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // 공지사항 목록 가져오기
        db.all(query, params, (err, notices) => {
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
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notices/:id - 특정 공지사항 조회
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      res.json(notice);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
