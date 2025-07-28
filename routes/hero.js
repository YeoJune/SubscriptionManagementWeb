// routes/hero.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// multer 설정 - 히어로 이미지 업로드
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/hero');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'hero-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

// GET /api/hero - 활성화된 히어로 슬라이드 목록 조회 (홈페이지용)
router.get('/', (req, res) => {
  try {
    const query = `
      SELECT id, title, subtitle, images 
      FROM hero_slides 
      WHERE is_active = 1 
      ORDER BY display_order ASC, created_at ASC
    `;

    db.all(query, [], (err, slides) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 이미지 경로 파싱
      const parsedSlides = slides.map((slide) => ({
        ...slide,
        images: slide.images ? JSON.parse(slide.images) : [],
      }));

      res.json({ slides: parsedSlides });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/hero/admin - 전체 히어로 슬라이드 목록 조회 (관리자용)
router.get('/admin', checkAdmin, (req, res) => {
  try {
    const query = `
      SELECT * FROM hero_slides 
      ORDER BY display_order ASC, created_at DESC
    `;

    db.all(query, [], (err, slides) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 이미지 경로 파싱
      const parsedSlides = slides.map((slide) => ({
        ...slide,
        images: slide.images ? JSON.parse(slide.images) : [],
      }));

      res.json({ slides: parsedSlides });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/hero (admin) - 히어로 슬라이드 등록
router.post('/', checkAdmin, upload.array('images', 10), (req, res) => {
  try {
    const { title, subtitle, is_active, display_order } = req.body;

    // 업로드된 이미지들의 경로 배열
    const imagePaths =
      req.files && req.files.length > 0
        ? req.files.map((file) => `/public/uploads/hero/${file.filename}`)
        : [];

    // 유효성 검사
    if (!title || !title.trim()) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: '제목은 필수 입력 사항입니다.' });
    }

    // 이미지 배열을 JSON으로 저장
    const imagesJson =
      imagePaths.length > 0 ? JSON.stringify(imagePaths) : null;

    const query = `
      INSERT INTO hero_slides (title, subtitle, images, is_active, display_order) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      title.trim(),
      subtitle ? subtitle.trim() : null,
      imagesJson,
      is_active === 'true' ? 1 : 0,
      parseInt(display_order) || 0,
    ];

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
        message: '히어로 슬라이드가 등록되었습니다.',
      });
    });
  } catch (error) {
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => fs.unlinkSync(file.path));
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/hero/:id (admin) - 히어로 슬라이드 수정
router.put('/:id', checkAdmin, upload.array('images', 10), (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      is_active,
      display_order,
      removeImages,
      existingImages,
    } = req.body;

    const newImagePaths =
      req.files && req.files.length > 0
        ? req.files.map((file) => `/public/uploads/hero/${file.filename}`)
        : [];

    // 유효성 검사
    if (!title || !title.trim()) {
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => fs.unlinkSync(file.path));
      }
      return res.status(400).json({ error: '제목은 필수 입력 사항입니다.' });
    }

    db.get(`SELECT * FROM hero_slides WHERE id = ?`, [id], (err, slide) => {
      if (err) {
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => fs.unlinkSync(file.path));
        }
        return res.status(500).json({ error: err.message });
      }

      if (!slide) {
        if (req.files && req.files.length > 0) {
          req.files.forEach((file) => fs.unlinkSync(file.path));
        }
        return res
          .status(404)
          .json({ error: '히어로 슬라이드를 찾을 수 없습니다.' });
      }

      // 기존 이미지 처리
      let existingImagesList = [];
      if (removeImages !== 'true') {
        if (existingImages) {
          try {
            existingImagesList = JSON.parse(existingImages);
          } catch (parseError) {
            console.error('전달받은 기존 이미지 파싱 오류:', parseError);
            existingImagesList = [];
          }
        } else if (slide.images) {
          try {
            existingImagesList = JSON.parse(slide.images);
          } catch (parseError) {
            console.error('DB 기존 이미지 파싱 오류:', parseError);
            existingImagesList = [];
          }
        }
      } else if (removeImages === 'true' && slide.images) {
        // 기존 이미지 파일들 삭제
        try {
          const oldImages = JSON.parse(slide.images);
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

      const query = `
        UPDATE hero_slides 
        SET title = ?, subtitle = ?, images = ?, is_active = ?, display_order = ? 
        WHERE id = ?
      `;
      const params = [
        title.trim(),
        subtitle ? subtitle.trim() : null,
        imagesJson,
        is_active === 'true' ? 1 : 0,
        parseInt(display_order) || 0,
        id,
      ];

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
            .json({ error: '히어로 슬라이드 업데이트에 실패했습니다.' });
        }

        res.json({
          id: parseInt(id),
          images: finalImages,
          message: '히어로 슬라이드가 수정되었습니다.',
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

// DELETE /api/hero/:id (admin) - 히어로 슬라이드 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    db.get(`SELECT * FROM hero_slides WHERE id = ?`, [id], (err, slide) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!slide) {
        return res
          .status(404)
          .json({ error: '히어로 슬라이드를 찾을 수 없습니다.' });
      }

      // 이미지 파일들 삭제
      if (slide.images) {
        try {
          const imagePaths = JSON.parse(slide.images);
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

      db.run(`DELETE FROM hero_slides WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res
            .status(404)
            .json({ error: '히어로 슬라이드 삭제에 실패했습니다.' });
        }

        res.json({ message: '히어로 슬라이드가 삭제되었습니다.' });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
