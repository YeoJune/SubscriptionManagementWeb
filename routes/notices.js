// routes/notices.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

/*
-- 공지 테이블 (notice) - images 필드로 변경
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT,
  images TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// multer 설정 - 다중 이미지 업로드
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/notices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'notice-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        '지원되지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 허용)'
      ),
      false
    );
  }
};

// 다중 이미지 업로드 설정
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

// 공지사항 이미지 최적화 함수 - 가로 1500px 제한 & WebP 변환
async function optimizeNoticeImage(inputPath) {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // 파일명에서 확장자를 .webp로 변경
    const outputPath = inputPath.replace(/\.[^.]+$/, '.webp');

    // 가로가 1500px을 넘으면 리사이징, 아니면 그대로 WebP 변환
    if (metadata.width > 1500) {
      await image
        .resize({ width: 1500, withoutEnlargement: true })
        .webp({ quality: 85 }) // 85% 품질로 WebP 변환
        .toFile(outputPath);
    } else {
      await image.webp({ quality: 85 }).toFile(outputPath);
    }

    // 원본 파일 삭제 (WebP로 교체)
    if (inputPath !== outputPath && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    return outputPath;
  } catch (error) {
    console.error('공지사항 이미지 최적화 중 오류 발생:', error);
    // 최적화 실패 시 원본 파일 그대로 사용
    return inputPath;
  }
}

// POST /api/notices (admin) - 공지사항 등록
router.post('/', checkAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const { type, title, content, question, answer } = req.body;

    // 업로드된 이미지들 최적화 처리
    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const optimizedPath = await optimizeNoticeImage(file.path);
          imagePaths.push(
            `/public/uploads/notices/${path.basename(optimizedPath)}`
          );
        } catch (err) {
          console.error('공지사항 이미지 최적화 실패:', err);
          imagePaths.push(`/public/uploads/notices/${file.filename}`);
        }
      }
    }

    // 유효성 검사
    if (!type || !title) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: '타입과 제목은 필수 입력 사항입니다.' });
    }

    if (type !== 'normal' && type !== 'faq') {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    if (type === 'faq' && (!question || !answer)) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: 'FAQ의 경우 질문과 답변은 필수 입력 사항입니다.' });
    }

    if (type === 'normal' && !content) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: '일반 공지의 경우 내용은 필수 입력 사항입니다.' });
    }

    // 이미지 배열을 JSON으로 저장
    const imagesJson =
      imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;

    let query = '';
    let params = [];

    if (type === 'normal') {
      query = `INSERT INTO notice (type, title, content, images) VALUES (?, ?, ?, ?)`;
      params = [type, title, content, imagesJson];
    } else {
      query = `INSERT INTO notice (type, title, question, answer, images) VALUES (?, ?, ?, ?, ?)`;
      params = [type, title, question, answer, imagesJson];
    }

    db.run(query, params, function (err) {
      if (err) {
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => fs.unlinkSync(file.path));
        }
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: this.lastID,
        images: imagePaths,
        message:
          type === 'normal'
            ? '공지사항이 등록되었습니다.'
            : 'FAQ가 등록되었습니다.',
      });
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notices/:id (admin) - 공지사항 수정
router.put('/:id', checkAdmin, upload.array('images', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      title,
      content,
      question,
      answer,
      removeImages,
      existingImages,
    } = req.body;

    // 새 이미지 최적화 처리
    const newImagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const optimizedPath = await optimizeNoticeImage(file.path);
          newImagePaths.push(
            `/public/uploads/notices/${path.basename(optimizedPath)}`
          );
        } catch (err) {
          console.error('공지사항 이미지 최적화 실패:', err);
          newImagePaths.push(`/public/uploads/notices/${file.filename}`);
        }
      }
    }

    // 유효성 검사
    if (!type || !title) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: '타입과 제목은 필수 입력 사항입니다.' });
    }

    if (type !== 'normal' && type !== 'faq') {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: "타입은 'normal' 또는 'faq'만 가능합니다." });
    }

    if (type === 'faq' && (!question || !answer)) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: 'FAQ의 경우 질문과 답변은 필수 입력 사항입니다.' });
    }

    if (type === 'normal' && !content) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res
        .status(400)
        .json({ error: '일반 공지의 경우 내용은 필수 입력 사항입니다.' });
    }

    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => fs.unlinkSync(file.path));
        }
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => fs.unlinkSync(file.path));
        }
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      // 기존 이미지 처리
      let existingImagesList = [];
      if (removeImages !== 'true') {
        // removeImages가 true가 아닌 경우 기존 이미지 처리
        if (existingImages) {
          // 프론트엔드에서 전달받은 기존 이미지 사용
          try {
            existingImagesList = JSON.parse(existingImages);
          } catch (parseError) {
            console.error('전달받은 기존 이미지 파싱 오류:', parseError);
            existingImagesList = [];
          }
        } else if (notice.images) {
          // 전달받은 기존 이미지가 없으면 DB에서 가져온 이미지 사용
          try {
            existingImagesList = JSON.parse(notice.images);
          } catch (parseError) {
            console.error('DB 기존 이미지 파싱 오류:', parseError);
            existingImagesList = [];
          }
        }
      } else if (removeImages === 'true' && notice.images) {
        // removeImages가 true인 경우 기존 이미지 파일들 삭제
        try {
          const oldImages = JSON.parse(notice.images);
          oldImages.forEach((imagePath) => {
            const fullPath = path.join(__dirname, '../public', imagePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });
        } catch (parseError) {
          console.error('기존 이미지 파싱 오류:', parseError);
        }
      }

      // 기존 이미지와 새 이미지 결합
      const finalImages = [...existingImagesList, ...newImagePaths];
      const imagesJson =
        finalImages.length > 0 ? JSON.stringify(finalImages) : null;

      let query = '';
      let params = [];

      if (type === 'normal') {
        query = `UPDATE notice SET type = ?, title = ?, content = ?, question = NULL, answer = NULL, images = ? WHERE id = ?`;
        params = [type, title, content, imagesJson, id];
      } else {
        query = `UPDATE notice SET type = ?, title = ?, content = NULL, question = ?, answer = ?, images = ? WHERE id = ?`;
        params = [type, title, question, answer, imagesJson, id];
      }

      db.run(query, params, function (err) {
        if (err) {
          if (req.files && req.files.length > 0) {
            req.files.forEach((file) => fs.unlinkSync(file.path));
          }
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          if (req.files && req.files.length > 0) {
            req.files.forEach((file) => fs.unlinkSync(file.path));
          }
          return res
            .status(404)
            .json({ error: '공지사항 업데이트에 실패했습니다.' });
        }

        res.json({
          id: parseInt(id),
          images: finalImages,
          message:
            type === 'normal'
              ? '공지사항이 수정되었습니다.'
              : 'FAQ가 수정되었습니다.',
        });
      });
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notices/:id (admin) - 공지사항 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.get(`SELECT * FROM notice WHERE id = ?`, [id], (err, notice) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!notice) {
        return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
      }

      // 이미지 파일들 삭제
      if (notice.images) {
        try {
          const imagePaths = JSON.parse(notice.images);
          imagePaths.forEach((imagePath) => {
            const fullPath = path.join(__dirname, '../public', imagePath);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          });
        } catch (parseError) {
          console.error('이미지 경로 파싱 오류:', parseError);
        }
      }

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

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
        query = `SELECT id, type, title, content, images, created_at FROM notice${whereClause}`;
      } else {
        query = `SELECT id, type, title, question, answer, images, created_at FROM notice${whereClause}`;
      }
    } else {
      query = `SELECT id, type, title, content, question, answer, images, created_at FROM notice`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.get(
      countQuery,
      params.slice(0, params.length - 2),
      (err, countResult) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        db.all(query, params, (err, notices) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // 이미지 경로 파싱
          const parsedNotices = notices.map((notice) => ({
            ...notice,
            images: notice.images ? JSON.parse(notice.images) : [],
          }));

          res.json({
            notices: parsedNotices,
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

      const parsedNotice = {
        ...notice,
        images: notice.images ? JSON.parse(notice.images) : [],
      };

      res.json(parsedNotice);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
