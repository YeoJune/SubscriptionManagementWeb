// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const {
  hashPassword,
  verifyPassword,
  generateSalt,
  authMiddleware,
} = require('../lib/auth');

/*
-- 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  total_delivery_count INTEGER DEFAULT 0,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
*/

// POST /api/auth/signup - 회원가입
router.post('/signup', (req, res) => {
  try {
    const { id, password, name, phone_number, email, address } = req.body;

    // 유효성 검사
    if (!id || !password || !phone_number) {
      return res
        .status(400)
        .json({ error: '아이디, 비밀번호, 전화번호는 필수 입력 사항입니다.' });
    }

    // ID 형식 검증
    const idPattern = /^[a-zA-Z][a-zA-Z0-9_-]{3,19}$/;
    if (!idPattern.test(id)) {
      return res.status(400).json({
        error:
          '아이디는 영문자로 시작하며, 영문자, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능합니다 (4-20자).',
      });
    }

    // 공백 및 특수문자 추가 검증
    if (/\s/.test(id)) {
      return res
        .status(400)
        .json({ error: '아이디에 공백을 포함할 수 없습니다.' });
    }

    // 전화번호 형식 검사 (선택적)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone_number.replace(/-/g, ''))) {
      return res
        .status(400)
        .json({ error: '올바른 전화번호 형식이 아닙니다.' });
    }

    // 비밀번호 복잡성 검사 (선택적)
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 이미 가입된 아이디인지 확인
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (existingUser) {
        return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
      }

      // 이미 가입된 전화번호인지 확인
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
              .json({ error: '이미 등록된 전화번호입니다.' });
          }

          // 비밀번호 해싱
          const salt = generateSalt();
          const password_hash = hashPassword(password, salt);

          // 사용자 생성
          db.run(
            `INSERT INTO users (id, password_hash, salt, total_delivery_count, name, phone_number, email, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, password_hash, salt, 0, name, phone_number, email, address],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.status(201).json({
                message: '회원가입이 완료되었습니다. 로그인해주세요.',
                userId: id,
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

// POST /api/auth/login - 로그인
router.post('/login', (req, res) => {
  try {
    const { id, password } = req.body;

    // 유효성 검사
    if (!id || !password) {
      return res
        .status(400)
        .json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 사용자가 존재하지 않는 경우
      if (!user) {
        return res
          .status(401)
          .json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      }

      // 비밀번호 검증
      const isValidPassword = verifyPassword(
        password,
        user.password_hash,
        user.salt
      );

      if (!isValidPassword) {
        return res
          .status(401)
          .json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      }

      // 마지막 로그인 시간 업데이트
      db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [
        user.id,
      ]);

      // 세션에 사용자 정보 저장
      req.session.user = {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        email: user.email,
        address: user.address,
        total_delivery_count: user.total_delivery_count,
        card_payment_allowed: !!user.card_payment_allowed,
        // 관리자 권한 확인 (예: 특정 아이디를 관리자로 지정)
        isAdmin: user.id === process.env.ADMIN_ID, // 예시: 'admin'이란 아이디를 가진 사용자가 관리자
      };

      // 상품별 배송 횟수 조회 추가
      db.all(
        `SELECT upd.product_id, p.name as product_name, upd.remaining_count
         FROM user_product_delivery upd
         JOIN product p ON upd.product_id = p.id
         WHERE upd.user_id = ?
         ORDER BY p.name ASC`,
        [user.id],
        (err, products) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // 전체 남은 배송 횟수 계산
          const totalDeliveryCount = products.reduce(
            (sum, p) => sum + p.remaining_count,
            0
          );

          res.json({
            message: '로그인 성공',
            user: {
              id: user.id,
              name: user.name,
              phone_number: user.phone_number,
              email: user.email,
              address: user.address,
              total_delivery_count: totalDeliveryCount,
              isAdmin: req.session.user.isAdmin,
              card_payment_allowed: !!user.card_payment_allowed,
              created_at: user.created_at,
              last_login: user.last_login,
            },
            product_delivery: products,
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout - 로그아웃
router.post('/logout', authMiddleware, (req, res) => {
  try {
    // 세션 삭제
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: '로그아웃 중 오류가 발생했습니다.' });
      }

      res.clearCookie('connect.sid'); // 세션 쿠키 삭제
      res.json({ message: '로그아웃 되었습니다.' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// routes/auth.js의 GET /api/auth
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.session.user.id;

    // 사용자 기본 정보 조회
    db.get(
      `SELECT id, name, phone_number, email, address, card_payment_allowed, created_at, last_login FROM users WHERE id = ?`,
      [userId],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          req.session.destroy();
          return res
            .status(404)
            .json({ error: '사용자 정보를 찾을 수 없습니다.' });
        }

        // 상품별 배송 횟수 조회
        db.all(
          `SELECT upd.product_id, p.name as product_name, upd.remaining_count
           FROM user_product_delivery upd
           JOIN product p ON upd.product_id = p.id
           WHERE upd.user_id = ?
           ORDER BY p.name ASC`,
          [userId],
          (err, products) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // 전체 남은 배송 횟수 계산
            const totalDeliveryCount = products.reduce(
              (sum, p) => sum + p.remaining_count,
              0
            );

            res.json({
              user: {
                id: user.id,
                name: user.name,
                phone_number: user.phone_number,
                email: user.email,
                address: user.address,
                isAdmin: req.session.user.isAdmin,
                card_payment_allowed: !!user.card_payment_allowed,
                created_at: user.created_at,
                last_login: user.last_login,
                total_delivery_count: totalDeliveryCount,
              },
              product_delivery: products,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - 사용자 프로필 업데이트 (주소 저장용)
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const user_id = req.session.user.id;
    const { address, name, phone_number, email } = req.body;

    // 업데이트할 필드들을 동적으로 구성
    const updateFields = [];
    const updateValues = [];

    if (address !== undefined) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (phone_number !== undefined) {
      updateFields.push('phone_number = ?');
      updateValues.push(phone_number);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '업데이트할 정보가 없습니다.' });
    }

    updateValues.push(user_id);

    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(query, updateValues, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }

      res.json({
        message: '프로필이 성공적으로 업데이트되었습니다.',
        updated_fields: Object.keys(req.body),
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/profile - 사용자 프로필 조회
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const user_id = req.session.user.id;

    db.get(
      'SELECT id, name, phone_number, email, address, card_payment_allowed, created_at FROM users WHERE id = ?',
      [user_id],
      (err, user) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (!user) {
          return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
        }

        res.json({ user });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
