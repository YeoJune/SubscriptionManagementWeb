// test.js
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(
  path.join(__dirname, 'database.sqlite'),
  (err) => {
    if (err) {
      console.error('데이터베이스 연결 오류:', err.message);
      return;
    }
    console.log('데이터베이스에 연결되었습니다.');
  }
);

// 비동기 실행을 위한 유틸리티
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('쿼리 실행 오류:', err.message);
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
};

// 단일 행 조회
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('쿼리 실행 오류:', err.message);
        reject(err);
        return;
      }
      resolve(row);
    });
  });
};

// 여러 행 조회
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('쿼리 실행 오류:', err.message);
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
};

// 트랜잭션 시작
const beginTransaction = () => {
  return new Promise((resolve, reject) => {
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 트랜잭션 커밋
const commitTransaction = () => {
  return new Promise((resolve, reject) => {
    db.run('COMMIT', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 트랜잭션 롤백
const rollbackTransaction = () => {
  return new Promise((resolve, reject) => {
    db.run('ROLLBACK', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 테이블 생성 함수
const createTables = async () => {
  // 사용자 테이블 생성 - 최신 스키마에 맞게 업데이트
  await run(`
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
    )
  `);

  // 상품 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      delivery_count INTEGER NOT NULL DEFAULT 1,
      image_path TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 공지사항 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS notice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      question TEXT,
      answer TEXT,
      image_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 결제 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      amount REAL NOT NULL,
      order_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      payment_gateway_transaction_id TEXT,
      raw_response_data TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 배송 목록 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS delivery_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL DEFAULT 'pending',
      date TEXT NOT NULL,
      product_id INTEGER NOT NULL
    )
  `);

  // SMS 로그 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 고객의 소리 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT,
      status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      answered_at TIMESTAMP
    )
  `);

  // 사용자별 상품 배송 잔여 횟수 테이블 생성 (신규)
  await run(`
    CREATE TABLE IF NOT EXISTS user_product_delivery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      remaining_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id)
    )
  `);

  console.log('모든 테이블이 생성되었습니다.');
};

// 비밀번호 해싱 함수
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

// 공지사항을 제외한 모든 테이블 데이터 삭제
const clearTablesExceptNotice = async () => {
  try {
    await beginTransaction();

    console.log('공지사항을 제외한 모든 테이블 데이터를 삭제합니다...');

    // 외래키 제약 조건 때문에 순서에 주의하여 삭제
    await run('DELETE FROM user_product_delivery');
    await run('DELETE FROM sms_logs');
    await run('DELETE FROM inquiries');
    await run('DELETE FROM delivery_list');
    await run('DELETE FROM payments');
    await run('DELETE FROM product');
    await run('DELETE FROM users');

    console.log('데이터 삭제가 완료되었습니다.');

    await commitTransaction();
  } catch (error) {
    await rollbackTransaction();
    console.error('데이터 삭제 중 오류 발생:', error);
    throw error;
  }
};

// 테스트 데이터 삽입 함수
const insertTestData = async () => {
  try {
    await beginTransaction();

    // 사용자 데이터 삽입 - 최신 스키마에 맞게 필드 추가
    const users = [
      {
        id: 'saluvallday',
        password: 'rlaqhdwns0!',
        name: '관리자',
        phone_number: '01012345678',
        email: 'admin@example.com',
        address: '서울시 강남구 테헤란로 123',
        total_delivery_count: 0,
      },
    ];

    for (const user of users) {
      const salt = generateSalt();
      const hash = hashPassword(user.password, salt);
      await run(
        "INSERT INTO users (id, password_hash, salt, name, total_delivery_count, phone_number, email, address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
        [
          user.id,
          hash,
          salt,
          user.name,
          user.total_delivery_count,
          user.phone_number,
          user.email,
          user.address,
        ]
      );
    }
    console.log('사용자 데이터가 생성되었습니다.');

    // 상품 데이터 삽입
    const products = [
      {
        name: '2주 가성비',
        description: '2주 가성비 식단',
        price: 70000,
        delivery_count: 6,
      },
      {
        name: '4주 가성비',
        description: '4주 가성비 식단',
        price: 130000,
        delivery_count: 12,
      },
      {
        name: '2주 세트식단',
        description: '2주 동안 매일 다른 세트식단',
        price: 70000,
        delivery_count: 6,
      },
      {
        name: '4주 세트식단',
        description: '4주 동안 매일 다른 세트식단',
        price: 130000,
        delivery_count: 12,
      },
    ];

    for (const product of products) {
      await run(
        'INSERT INTO product (name, description, price, delivery_count) VALUES (?, ?, ?, ?)',
        [
          product.name,
          product.description,
          product.price,
          product.delivery_count,
        ]
      );
    }
    console.log('상품 데이터가 생성되었습니다.');

    await commitTransaction();
    console.log('지정된 테스트 데이터가 성공적으로 생성되었습니다.');
  } catch (error) {
    await rollbackTransaction();
    console.error('데이터 생성 중 오류 발생:', error);
  }
};

// 메인 함수
const main = async () => {
  try {
    await createTables();
    await clearTablesExceptNotice();
    await insertTestData();
  } catch (error) {
    console.error('오류 발생:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('데이터베이스 연결 종료 오류:', err.message);
      } else {
        console.log('데이터베이스 연결이 종료되었습니다.');
      }
    });
  }
};

// 스크립트 실행
main();
