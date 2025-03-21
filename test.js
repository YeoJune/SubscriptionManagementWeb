// test.js
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');

// 데이터베이스 연결
const db = new sqlite3.Database(path.join(__dirname, 'delivery_system.db'), (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err.message);
    return;
  }
  console.log('데이터베이스에 연결되었습니다.');
});

// 비동기 실행을 위한 유틸리티
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('쿼리 실행 오류:', err.message);
        reject(err);
        return;
      }
      resolve(this.lastID);
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
  // 사용자 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      delivery_count INTEGER DEFAULT 0,
      phone_number TEXT
    )
  `);

  // 상품 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 결제 테이블 생성
  await run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      count INTEGER NOT NULL,
      amount REAL NOT NULL,
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

  console.log('모든 테이블이 생성되었습니다.');
};

// 비밀번호 해싱 함수
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = bcrypt.hashSync(password, 10);
  return { hash, salt };
};

// 테스트 데이터 삽입 함수
const insertTestData = async () => {
  try {
    await beginTransaction();

    // 사용자 데이터 삽입
    const users = [
      { id: 'admin', password: 'admin123', phone_number: '01012345678', delivery_count: 0 },
      { id: 'user1', password: 'password1', phone_number: '01023456789', delivery_count: 10 },
      { id: 'user2', password: 'password2', phone_number: '01034567890', delivery_count: 5 },
      { id: 'user3', password: 'password3', phone_number: '01045678901', delivery_count: 15 },
      { id: 'user4', password: 'password4', phone_number: '01056789012', delivery_count: 8 },
      { id: 'user5', password: 'password5', phone_number: '01067890123', delivery_count: 2 }
    ];

    for (const user of users) {
      const { hash, salt } = hashPassword(user.password);
      await run(
        'INSERT INTO users (id, password_hash, salt, delivery_count, phone_number) VALUES (?, ?, ?, ?, ?)',
        [user.id, hash, salt, user.delivery_count, user.phone_number]
      );
    }
    console.log('사용자 데이터가 생성되었습니다.');

    // 상품 데이터 삽입
    const products = [
      { name: '프리미엄 세트', description: '최고급 상품으로 구성된 세트', price: 50000 },
      { name: '기본 세트', description: '일반적인 상품으로 구성된 세트', price: 30000 },
      { name: '신선 과일 세트', description: '제철 과일로 구성된 세트', price: 40000 },
      { name: '고급 채소 세트', description: '유기농 채소로 구성된 세트', price: 35000 },
      { name: '간식 세트', description: '다양한 간식으로 구성된 세트', price: 25000 }
    ];

    for (const product of products) {
      await run(
        'INSERT INTO product (name, description, price) VALUES (?, ?, ?)',
        [product.name, product.description, product.price]
      );
    }
    console.log('상품 데이터가 생성되었습니다.');

    // 공지사항 데이터 삽입
    const notices = [
      { 
        type: 'normal', 
        title: '시스템 점검 안내', 
        content: '2023년 3월 15일 00:00부터 04:00까지 시스템 점검이 예정되어 있습니다. 이용에 참고 부탁드립니다.',
        question: null,
        answer: null
      },
      { 
        type: 'normal', 
        title: '배송 서비스 개선 안내', 
        content: '2023년 4월부터 새로운 배송 서비스가 시작됩니다. 자세한 내용은 공지사항을 참고해주세요.',
        question: null,
        answer: null
      },
      { 
        type: 'faq', 
        title: '배송 관련 FAQ', 
        content: null,
        question: '배송일을 변경할 수 있나요?',
        answer: '현재는 배송일 변경 서비스를 제공하지 않고 있습니다. 추후 서비스 개선 시 반영할 예정입니다.'
      },
      { 
        type: 'faq', 
        title: '결제 관련 FAQ', 
        content: null,
        question: '결제 후 취소는 어떻게 하나요?',
        answer: '결제 후 24시간 이내에 고객센터로 연락주시면 취소 처리가 가능합니다.'
      },
      { 
        type: 'faq', 
        title: '상품 관련 FAQ', 
        content: null,
        question: '상품 구성을 변경할 수 있나요?',
        answer: '상품 구성 변경은 현재 지원하지 않습니다. 다양한 세트 상품을 이용해주세요.'
      }
    ];

    for (const notice of notices) {
      await run(
        'INSERT INTO notice (type, title, content, question, answer) VALUES (?, ?, ?, ?, ?)',
        [notice.type, notice.title, notice.content, notice.question, notice.answer]
      );
    }
    console.log('공지사항 데이터가 생성되었습니다.');

    // 결제 데이터 삽입
    const payments = [
      { user_id: 'user1', product_id: 1, count: 5, amount: 250000 },
      { user_id: 'user1', product_id: 3, count: 5, amount: 200000 },
      { user_id: 'user2', product_id: 2, count: 5, amount: 150000 },
      { user_id: 'user3', product_id: 4, count: 10, amount: 350000 },
      { user_id: 'user3', product_id: 1, count: 5, amount: 250000 },
      { user_id: 'user4', product_id: 5, count: 8, amount: 200000 },
      { user_id: 'user5', product_id: 2, count: 2, amount: 60000 }
    ];

    for (const payment of payments) {
      await run(
        'INSERT INTO payments (user_id, product_id, count, amount) VALUES (?, ?, ?, ?)',
        [payment.user_id, payment.product_id, payment.count, payment.amount]
      );
    }
    console.log('결제 데이터가 생성되었습니다.');

    // 현재 날짜 기준으로 배송 데이터 생성
    const today = new Date();
    const getDateString = (daysToAdd) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysToAdd);
      return date.toISOString().split('T')[0];
    };

    const deliveries = [
      // user1의 배송 데이터
      { user_id: 'user1', status: 'complete', date: getDateString(-5), product_id: 1 },
      { user_id: 'user1', status: 'complete', date: getDateString(-3), product_id: 1 },
      { user_id: 'user1', status: 'pending', date: getDateString(0), product_id: 1 }, // 오늘
      { user_id: 'user1', status: 'pending', date: getDateString(2), product_id: 1 },
      { user_id: 'user1', status: 'pending', date: getDateString(4), product_id: 1 },
      { user_id: 'user1', status: 'pending', date: getDateString(-4), product_id: 3 },
      { user_id: 'user1', status: 'complete', date: getDateString(-2), product_id: 3 },
      { user_id: 'user1', status: 'pending', date: getDateString(1), product_id: 3 },
      { user_id: 'user1', status: 'pending', date: getDateString(3), product_id: 3 },
      { user_id: 'user1', status: 'pending', date: getDateString(5), product_id: 3 },
      
      // user2의 배송 데이터
      { user_id: 'user2', status: 'complete', date: getDateString(-4), product_id: 2 },
      { user_id: 'user2', status: 'complete', date: getDateString(-2), product_id: 2 },
      { user_id: 'user2', status: 'pending', date: getDateString(0), product_id: 2 }, // 오늘
      { user_id: 'user2', status: 'pending', date: getDateString(2), product_id: 2 },
      { user_id: 'user2', status: 'pending', date: getDateString(4), product_id: 2 },
      
      // user3의 배송 데이터
      { user_id: 'user3', status: 'complete', date: getDateString(-10), product_id: 4 },
      { user_id: 'user3', status: 'complete', date: getDateString(-8), product_id: 4 },
      { user_id: 'user3', status: 'complete', date: getDateString(-6), product_id: 4 },
      { user_id: 'user3', status: 'complete', date: getDateString(-4), product_id: 4 },
      { user_id: 'user3', status: 'complete', date: getDateString(-2), product_id: 4 },
      { user_id: 'user3', status: 'pending', date: getDateString(0), product_id: 1 }, // 오늘
      { user_id: 'user3', status: 'pending', date: getDateString(2), product_id: 1 },
      { user_id: 'user3', status: 'pending', date: getDateString(4), product_id: 1 },
      { user_id: 'user3', status: 'pending', date: getDateString(6), product_id: 1 },
      { user_id: 'user3', status: 'pending', date: getDateString(8), product_id: 1 },
      
      // user4의 배송 데이터
      { user_id: 'user4', status: 'complete', date: getDateString(-7), product_id: 5 },
      { user_id: 'user4', status: 'complete', date: getDateString(-5), product_id: 5 },
      { user_id: 'user4', status: 'complete', date: getDateString(-3), product_id: 5 },
      { user_id: 'user4', status: 'pending', date: getDateString(0), product_id: 5 }, // 오늘
      { user_id: 'user4', status: 'pending', date: getDateString(2), product_id: 5 },
      { user_id: 'user4', status: 'pending', date: getDateString(4), product_id: 5 },
      { user_id: 'user4', status: 'pending', date: getDateString(6), product_id: 5 },
      { user_id: 'user4', status: 'pending', date: getDateString(8), product_id: 5 },
      
      // user5의 배송 데이터
      { user_id: 'user5', status: 'complete', date: getDateString(-3), product_id: 2 },
      { user_id: 'user5', status: 'pending', date: getDateString(0), product_id: 2 } // 오늘
    ];

    for (const delivery of deliveries) {
      await run(
        'INSERT INTO delivery_list (user_id, status, date, product_id) VALUES (?, ?, ?, ?)',
        [delivery.user_id, delivery.status, delivery.date, delivery.product_id]
      );
    }
    console.log('배송 데이터가 생성되었습니다.');
    
    await commitTransaction();
    console.log('모든 테스트 데이터가 성공적으로 생성되었습니다.');

  } catch (error) {
    await rollbackTransaction();
    console.error('데이터 생성 중 오류 발생:', error);
  }
};

// 메인 함수
const main = async () => {
  try {
    await createTables();
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