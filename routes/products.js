// routes/products.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const db = require('../lib/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/*
-- 상품 테이블 (product) - 이미지 및 순서 필드 추가
CREATE TABLE IF NOT EXISTS product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  delivery_count INTEGER NOT NULL DEFAULT 1,
  image_path TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// multer 설정 - 이미지 업로드를 위한 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/products');

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
    cb(null, 'product-' + uniqueSuffix + ext);
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 제한
});

// GET /api/products - 상품 목록 조회
router.get('/', (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 기능
    const searchTerm = req.query.search || '';

    // 정렬 기능 - 유효한 필드만 허용
    const allowedSortFields = [
      'name',
      'price',
      'delivery_count',
      'created_at',
      'sort_order',
    ];
    let sortBy = req.query.sortBy || 'sort_order';
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'sort_order'; // 기본값을 순서로 설정
    }

    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    // 파라미터 배열
    const params = [];
    const countParams = [];

    let query = `SELECT id, name, description, price, delivery_count, image_path, sort_order, created_at FROM product`;
    let countQuery = `SELECT COUNT(*) as total FROM product`;

    if (searchTerm) {
      const searchCondition = ` WHERE name LIKE ? OR description LIKE ?`;
      query += searchCondition;
      countQuery += searchCondition;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      countParams.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 전체 상품 수 가져오기
    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 상품 목록 가져오기
      db.all(query, params, (err, products) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          products,
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

// GET /api/products/:id - 특정 상품 조회
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      `SELECT id, name, description, price, delivery_count, image_path, sort_order, created_at FROM product WHERE id = ?`,
      [id],
      (err, product) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!product) {
          return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
        }

        res.json(product);
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products (admin) - 상품 등록
router.post('/', checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { name, description, price, delivery_count, sort_order } = req.body;
    const imagePath = req.file
      ? `/public/uploads/products/${req.file.filename}`
      : null;

    // 유효성 검사
    if (!name || price === undefined) {
      // 업로드된 이미지가 있으면 삭제
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '상품명과 가격은 필수 입력 사항입니다.' });
    }

    // 가격 유효성 검사
    if (isNaN(price) || price < 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '가격은 0 이상의 숫자여야 합니다.' });
    }

    // 배송 횟수 유효성 검사
    const productDeliveryCount =
      delivery_count !== undefined ? delivery_count : 1;
    if (isNaN(productDeliveryCount) || productDeliveryCount < 1) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '배송 횟수는 1 이상의 숫자여야 합니다.' });
    }

    // 순서 유효성 검사
    const productSortOrder = sort_order !== undefined ? sort_order : 0;
    if (isNaN(productSortOrder)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '순서는 숫자여야 합니다.' });
    }

    // 데이터베이스에 저장
    db.run(
      `INSERT INTO product (name, description, price, delivery_count, image_path, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        price,
        productDeliveryCount,
        imagePath,
        productSortOrder,
      ],
      function (err) {
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
          message: '상품이 성공적으로 등록되었습니다.',
        });
      }
    );
  } catch (error) {
    // 오류 발생 시 업로드된 이미지 삭제
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id (admin) - 상품 수정
router.put('/:id', checkAdmin, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      delivery_count,
      sort_order,
      removeImage,
    } = req.body;
    const newImagePath = req.file
      ? `/public/uploads/products/${req.file.filename}`
      : null;

    // 유효성 검사
    if (!name || price === undefined) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '상품명과 가격은 필수 입력 사항입니다.' });
    }

    // 가격 유효성 검사
    if (isNaN(price) || price < 0) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '가격은 0 이상의 숫자여야 합니다.' });
    }

    // 배송 횟수 유효성 검사
    if (
      delivery_count !== undefined &&
      (isNaN(delivery_count) || delivery_count < 1)
    ) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res
        .status(400)
        .json({ error: '배송 횟수는 1 이상의 숫자여야 합니다.' });
    }

    // 순서 유효성 검사
    if (sort_order !== undefined && isNaN(sort_order)) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: '순서는 숫자여야 합니다.' });
    }

    // 해당 상품이 존재하는지 확인
    db.get(`SELECT * FROM product WHERE id = ?`, [id], (err, product) => {
      if (err) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ error: err.message });
      }

      if (!product) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      }

      // 이전 이미지 경로 저장
      const oldImagePath = product.image_path;

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

      // 업데이트할 값들 설정 (제공되지 않은 경우 기존 값 유지)
      const updatedDeliveryCount =
        delivery_count !== undefined ? delivery_count : product.delivery_count;
      const updatedSortOrder =
        sort_order !== undefined ? sort_order : product.sort_order;

      // 데이터베이스 업데이트
      db.run(
        `UPDATE product SET name = ?, description = ?, price = ?, delivery_count = ?, image_path = ?, sort_order = ? WHERE id = ?`,
        [
          name,
          description || '',
          price,
          updatedDeliveryCount,
          finalImagePath,
          updatedSortOrder,
          id,
        ],
        function (err) {
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
              .json({ error: '상품 업데이트에 실패했습니다.' });
          }

          res.json({
            id: parseInt(id),
            image_path: finalImagePath,
            message: '상품이 성공적으로 수정되었습니다.',
          });
        }
      );
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id (admin) - 상품 삭제
router.delete('/:id', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // 해당 상품이 존재하는지 확인
    db.get(`SELECT * FROM product WHERE id = ?`, [id], (err, product) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!product) {
        return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      }

      // 이미지 파일이 있으면 삭제
      if (product.image_path) {
        const fullPath = path.join(__dirname, '../public', product.image_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      // 데이터베이스에서 삭제
      db.run(`DELETE FROM product WHERE id = ?`, [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: '상품 삭제에 실패했습니다.' });
        }

        res.json({
          message: '상품이 성공적으로 삭제되었습니다.',
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
