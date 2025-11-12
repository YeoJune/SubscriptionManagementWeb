// routes/nutrition.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 이미지 저장 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/images/nutrition');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'nutrition-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
});

// 공개 API: 영양성분 정보 조회
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, image_path, created_at FROM nutrition_info ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ nutrition: null });
    }

    res.json({ nutrition: result.rows[0] });
  } catch (error) {
    console.error('영양성분 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 조회
router.get('/admin', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, image_path, created_at FROM nutrition_info ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ nutrition: null });
    }

    res.json({ nutrition: result.rows[0] });
  } catch (error) {
    console.error('영양성분 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 등록/업데이트
router.post('/admin', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '이미지를 업로드해주세요.' });
    }

    const imagePath = `/images/nutrition/${req.file.filename}`;

    // 기존 데이터 조회
    const existingResult = await db.query(
      'SELECT id, image_path FROM nutrition_info ORDER BY created_at DESC LIMIT 1'
    );

    if (existingResult.rows.length > 0) {
      // 기존 이미지 삭제
      const oldImagePath = existingResult.rows[0].image_path;
      if (oldImagePath) {
        const oldFilePath = path.join(__dirname, '../public', oldImagePath);
        try {
          await fs.unlink(oldFilePath);
        } catch (err) {
          console.error('기존 이미지 삭제 실패:', err);
        }
      }

      // 업데이트
      await db.query(
        'UPDATE nutrition_info SET image_path = $1, created_at = NOW() WHERE id = $2',
        [imagePath, existingResult.rows[0].id]
      );
    } else {
      // 새로 생성
      await db.query(
        'INSERT INTO nutrition_info (image_path, created_at) VALUES ($1, NOW())',
        [imagePath]
      );
    }

    res.json({
      message: '영양성분 정보가 업데이트되었습니다.',
      image_path: imagePath,
    });
  } catch (error) {
    console.error('영양성분 업로드 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 삭제
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 이미지 경로 조회
    const result = await db.query(
      'SELECT image_path FROM nutrition_info WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: '데이터를 찾을 수 없습니다.' });
    }

    // 이미지 파일 삭제
    const imagePath = result.rows[0].image_path;
    if (imagePath) {
      const filePath = path.join(__dirname, '../public', imagePath);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('이미지 파일 삭제 실패:', err);
      }
    }

    // DB에서 삭제
    await db.query('DELETE FROM nutrition_info WHERE id = $1', [id]);

    res.json({ message: '삭제되었습니다.' });
  } catch (error) {
    console.error('영양성분 삭제 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
