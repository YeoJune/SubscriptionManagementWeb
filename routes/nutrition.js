// routes/nutrition.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const checkAdmin = require('../lib/checkAdmin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 이미지 저장 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/nutrition');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'nutrition-' + uniqueSuffix + path.extname(file.originalname));
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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 공개 API: 영양성분 정보 조회
router.get('/', (req, res) => {
  try {
    db.get(
      'SELECT id, image_path, created_at FROM nutrition_info ORDER BY created_at DESC LIMIT 1',
      [],
      (err, nutrition) => {
        if (err) {
          console.error('영양성분 조회 실패:', err);
          return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        console.log('Nutrition data from DB:', nutrition);
        res.json({ nutrition: nutrition || null });
      }
    );
  } catch (error) {
    console.error('영양성분 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 조회
router.get('/admin', checkAdmin, (req, res) => {
  try {
    // 모든 데이터 확인
    db.all('SELECT * FROM nutrition_info', [], (err, all) => {
      console.log('All nutrition_info rows:', all);
    });

    db.get(
      'SELECT * FROM nutrition_info ORDER BY created_at DESC LIMIT 1',
      [],
      (err, nutrition) => {
        if (err) {
          console.error('영양성분 조회 실패:', err);
          return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        console.log(
          'nutrition:',
          nutrition,
          'id type:',
          typeof nutrition?.id,
          'id value:',
          nutrition?.id
        );

        res.json({ nutrition: nutrition || null });
      }
    );
  } catch (error) {
    console.error('영양성분 조회 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 등록/업데이트
router.post('/admin', checkAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '이미지를 업로드해주세요.' });
    }

    const imagePath = `/public/uploads/nutrition/${req.file.filename}`;

    // 기존 데이터 조회
    db.get(
      'SELECT id, image_path FROM nutrition_info ORDER BY created_at DESC LIMIT 1',
      [],
      (err, existing) => {
        if (err) {
          console.error('기존 데이터 조회 실패:', err);
          // 업로드된 파일 삭제
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (existing) {
          // 기존 이미지 삭제
          if (existing.image_path) {
            const oldFilePath = path.join(
              __dirname,
              '../public',
              existing.image_path
            );
            try {
              if (fs.existsSync(oldFilePath)) {
                fs.unlinkSync(oldFilePath);
              }
            } catch (err) {
              console.error('기존 이미지 삭제 실패:', err);
            }
          }

          // 업데이트
          db.run(
            'UPDATE nutrition_info SET image_path = ? WHERE id = ?',
            [imagePath, existing.id],
            function (err) {
              if (err) {
                console.error('영양성분 업데이트 실패:', err);
                // 업로드된 파일 삭제
                if (req.file && fs.existsSync(req.file.path)) {
                  fs.unlinkSync(req.file.path);
                }
                return res
                  .status(500)
                  .json({ message: '서버 오류가 발생했습니다.' });
              }

              res.json({
                message: '영양성분 정보가 업데이트되었습니다.',
                image_path: imagePath,
              });
            }
          );
        } else {
          // 새로 생성
          db.run(
            'INSERT INTO nutrition_info (image_path) VALUES (?)',
            [imagePath],
            function (err) {
              if (err) {
                console.error('영양성분 생성 실패:', err);
                // 업로드된 파일 삭제
                if (req.file && fs.existsSync(req.file.path)) {
                  fs.unlinkSync(req.file.path);
                }
                return res
                  .status(500)
                  .json({ message: '서버 오류가 발생했습니다.' });
              }

              console.log('New nutrition created with ID:', this.lastID);
              res.json({
                id: this.lastID,
                message: '영양성분 정보가 등록되었습니다.',
                image_path: imagePath,
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('영양성분 업로드 실패:', error);
    // 업로드된 파일 삭제
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자 API: 영양성분 정보 삭제
router.delete('/admin/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 이미지 경로 조회
    db.get(
      'SELECT image_path FROM nutrition_info WHERE id = ?',
      [id],
      (err, nutrition) => {
        if (err) {
          console.error('영양성분 조회 실패:', err);
          return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }

        if (!nutrition) {
          return res
            .status(404)
            .json({ message: '데이터를 찾을 수 없습니다.' });
        }

        // 이미지 파일 삭제
        if (nutrition.image_path) {
          const filePath = path.join(
            __dirname,
            '../public',
            nutrition.image_path
          );
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (err) {
            console.error('이미지 파일 삭제 실패:', err);
          }
        }

        // DB에서 삭제
        db.run('DELETE FROM nutrition_info WHERE id = ?', [id], function (err) {
          if (err) {
            console.error('영양성분 삭제 실패:', err);
            return res
              .status(500)
              .json({ message: '서버 오류가 발생했습니다.' });
          }

          if (this.changes === 0) {
            return res
              .status(404)
              .json({ message: '영양성분 삭제에 실패했습니다.' });
          }

          res.json({ message: '삭제되었습니다.' });
        });
      }
    );
  } catch (error) {
    console.error('영양성분 삭제 실패:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
