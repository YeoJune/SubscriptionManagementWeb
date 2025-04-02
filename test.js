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

// 테스트 데이터 삽입 함수
const insertTestData = async () => {
  try {
    await beginTransaction();

    // 사용자 데이터 삽입 - 최신 스키마에 맞게 필드 추가
    const users = [
      {
        id: 'admin',
        password: 'admin123',
        name: '관리자',
        phone_number: '01012345678',
        email: 'admin@example.com',
        address: '서울시 강남구 테헤란로 123',
        total_delivery_count: 0,
      },
      {
        id: 'user1',
        password: 'password1',
        name: '홍길동',
        phone_number: '01023456789',
        email: 'user1@example.com',
        address: '서울시 서초구 반포대로 45',
        total_delivery_count: 10,
      },
      {
        id: 'user2',
        password: 'password2',
        name: '김철수',
        phone_number: '01034567890',
        email: 'user2@example.com',
        address: '서울시 송파구 올림픽로 123',
        total_delivery_count: 5,
      },
      {
        id: 'user3',
        password: 'password3',
        name: '이영희',
        phone_number: '01045678901',
        email: 'user3@example.com',
        address: '서울시 마포구 월드컵북로 456',
        total_delivery_count: 15,
      },
      {
        id: 'user4',
        password: 'password4',
        name: '박민준',
        phone_number: '01056789012',
        email: 'user4@example.com',
        address: '서울시 용산구 한남대로 78',
        total_delivery_count: 8,
      },
      {
        id: 'user5',
        password: 'password5',
        name: '정수민',
        phone_number: '01067890123',
        email: 'user5@example.com',
        address: '서울시 강서구 공항대로 254',
        total_delivery_count: 2,
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
        name: '프리미엄 세트',
        description: '최고급 상품으로 구성된 세트',
        price: 50000,
        delivery_count: 10,
      },
      {
        name: '기본 세트',
        description: '일반적인 상품으로 구성된 세트',
        price: 30000,
        delivery_count: 5,
      },
      {
        name: '신선 과일 세트',
        description: '제철 과일로 구성된 세트',
        price: 40000,
        delivery_count: 8,
      },
      {
        name: '고급 채소 세트',
        description: '유기농 채소로 구성된 세트',
        price: 35000,
        delivery_count: 7,
      },
      {
        name: '간식 세트',
        description: '다양한 간식으로 구성된 세트',
        price: 25000,
        delivery_count: 5,
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

    // 공지사항 데이터 삽입
    const notices = [
      {
        type: 'normal',
        title: '시스템 점검 안내',
        content:
          '2023년 3월 15일 00:00부터 04:00까지 시스템 점검이 예정되어 있습니다. 이용에 참고 부탁드립니다.',
        question: null,
        answer: null,
      },
      {
        type: 'normal',
        title: '배송 서비스 개선 안내',
        content:
          '2023년 4월부터 새로운 배송 서비스가 시작됩니다. 자세한 내용은 공지사항을 참고해주세요.',
        question: null,
        answer: null,
      },
      {
        type: 'faq',
        title: '배송 관련 FAQ',
        content: null,
        question: '배송일을 변경할 수 있나요?',
        answer:
          '현재는 배송일 변경 서비스를 제공하지 않고 있습니다. 추후 서비스 개선 시 반영할 예정입니다.',
      },
      {
        type: 'faq',
        title: '결제 관련 FAQ',
        content: null,
        question: '결제 후 취소는 어떻게 하나요?',
        answer:
          '결제 후 24시간 이내에 고객센터로 연락주시면 취소 처리가 가능합니다.',
      },
      {
        type: 'faq',
        title: '상품 관련 FAQ',
        content: null,
        question: '상품 구성을 변경할 수 있나요?',
        answer:
          '상품 구성 변경은 현재 지원하지 않습니다. 다양한 세트 상품을 이용해주세요.',
      },
    ];

    for (const notice of notices) {
      await run(
        'INSERT INTO notice (type, title, content, question, answer) VALUES (?, ?, ?, ?, ?)',
        [
          notice.type,
          notice.title,
          notice.content,
          notice.question,
          notice.answer,
        ]
      );
    }
    console.log('공지사항 데이터가 생성되었습니다.');

    // 결제 데이터 삽입
    const payments = [
      { user_id: 'user1', product_id: 1, count: 1, amount: 50000 },
      { user_id: 'user1', product_id: 3, count: 1, amount: 40000 },
      { user_id: 'user2', product_id: 2, count: 1, amount: 30000 },
      { user_id: 'user3', product_id: 4, count: 1, amount: 35000 },
      { user_id: 'user3', product_id: 1, count: 1, amount: 50000 },
      { user_id: 'user4', product_id: 5, count: 1, amount: 25000 },
      { user_id: 'user4', product_id: 1, count: 1, amount: 50000 },
      { user_id: 'user5', product_id: 2, count: 1, amount: 30000 },
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
      {
        user_id: 'user1',
        status: 'complete',
        date: getDateString(-5),
        product_id: 1,
      },
      {
        user_id: 'user1',
        status: 'complete',
        date: getDateString(-3),
        product_id: 1,
      },
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(0),
        product_id: 1,
      }, // 오늘
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(2),
        product_id: 1,
      },
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(4),
        product_id: 1,
      },
      {
        user_id: 'user1',
        status: 'complete',
        date: getDateString(-4),
        product_id: 3,
      },
      {
        user_id: 'user1',
        status: 'complete',
        date: getDateString(-2),
        product_id: 3,
      },
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(1),
        product_id: 3,
      },
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(3),
        product_id: 3,
      },
      {
        user_id: 'user1',
        status: 'pending',
        date: getDateString(5),
        product_id: 3,
      },

      // user2의 배송 데이터
      {
        user_id: 'user2',
        status: 'complete',
        date: getDateString(-4),
        product_id: 2,
      },
      {
        user_id: 'user2',
        status: 'complete',
        date: getDateString(-2),
        product_id: 2,
      },
      {
        user_id: 'user2',
        status: 'pending',
        date: getDateString(0),
        product_id: 2,
      }, // 오늘
      {
        user_id: 'user2',
        status: 'pending',
        date: getDateString(2),
        product_id: 2,
      },
      {
        user_id: 'user2',
        status: 'pending',
        date: getDateString(4),
        product_id: 2,
      },

      // user3의 배송 데이터
      {
        user_id: 'user3',
        status: 'complete',
        date: getDateString(-10),
        product_id: 4,
      },
      {
        user_id: 'user3',
        status: 'complete',
        date: getDateString(-8),
        product_id: 4,
      },
      {
        user_id: 'user3',
        status: 'complete',
        date: getDateString(-6),
        product_id: 4,
      },
      {
        user_id: 'user3',
        status: 'complete',
        date: getDateString(-4),
        product_id: 4,
      },
      {
        user_id: 'user3',
        status: 'complete',
        date: getDateString(-2),
        product_id: 4,
      },
      {
        user_id: 'user3',
        status: 'pending',
        date: getDateString(0),
        product_id: 1,
      }, // 오늘
      {
        user_id: 'user3',
        status: 'pending',
        date: getDateString(2),
        product_id: 1,
      },
      {
        user_id: 'user3',
        status: 'pending',
        date: getDateString(4),
        product_id: 1,
      },
      {
        user_id: 'user3',
        status: 'pending',
        date: getDateString(6),
        product_id: 1,
      },
      {
        user_id: 'user3',
        status: 'pending',
        date: getDateString(8),
        product_id: 1,
      },

      // user4의 배송 데이터
      {
        user_id: 'user4',
        status: 'complete',
        date: getDateString(-7),
        product_id: 5,
      },
      {
        user_id: 'user4',
        status: 'complete',
        date: getDateString(-5),
        product_id: 5,
      },
      {
        user_id: 'user4',
        status: 'complete',
        date: getDateString(-3),
        product_id: 5,
      },
      {
        user_id: 'user4',
        status: 'pending',
        date: getDateString(0),
        product_id: 5,
      }, // 오늘
      {
        user_id: 'user4',
        status: 'pending',
        date: getDateString(2),
        product_id: 5,
      },
      {
        user_id: 'user4',
        status: 'pending',
        date: getDateString(4),
        product_id: 1,
      },
      {
        user_id: 'user4',
        status: 'pending',
        date: getDateString(6),
        product_id: 1,
      },
      {
        user_id: 'user4',
        status: 'pending',
        date: getDateString(8),
        product_id: 1,
      },

      // user5의 배송 데이터
      {
        user_id: 'user5',
        status: 'complete',
        date: getDateString(-3),
        product_id: 2,
      },
      {
        user_id: 'user5',
        status: 'pending',
        date: getDateString(0),
        product_id: 2,
      }, // 오늘
    ];

    for (const delivery of deliveries) {
      await run(
        'INSERT INTO delivery_list (user_id, status, date, product_id) VALUES (?, ?, ?, ?)',
        [delivery.user_id, delivery.status, delivery.date, delivery.product_id]
      );
    }
    console.log('배송 데이터가 생성되었습니다.');

    // 고객의 소리 데이터 삽입
    const inquiries = [
      {
        user_id: 'user1',
        title: '배송 관련 문의',
        content:
          '지난 배송에서 상품이 일부 파손되어 있었습니다. 어떻게 처리해야 하나요?',
        answer:
          '불편을 드려 죄송합니다. 파손된 상품 사진을 고객센터로 보내주시면 바로 교환 조치 해드리겠습니다.',
        status: 'answered',
        answered_at: new Date(
          today.getTime() - 3 * 24 * 60 * 60 * 1000
        ).toISOString(), // 3일 전
      },
      {
        user_id: 'user2',
        title: '결제 관련 문의',
        content: '결제 후 영수증을 받지 못했습니다. 어디서 확인할 수 있나요?',
        answer:
          '결제 영수증은 등록하신 이메일로 자동 발송됩니다. 스팸함도 확인해보시고, 계속 문제가 있으시면 고객센터로 연락 부탁드립니다.',
        status: 'answered',
        answered_at: new Date(
          today.getTime() - 1 * 24 * 60 * 60 * 1000
        ).toISOString(), // 1일 전
      },
      {
        user_id: 'user3',
        title: '상품 구성 문의',
        content:
          '이번에 새로 나온 프리미엄 세트에는 어떤 제품들이 포함되어 있나요?',
        answer: null,
        status: 'unanswered',
        answered_at: null,
      },
      {
        user_id: 'user4',
        title: '배송 일정 변경 가능한가요?',
        content:
          '다음 주 배송 예정인데, 출장으로 인해 다른 날짜로 변경 가능할까요?',
        answer: null,
        status: 'unanswered',
        answered_at: null,
      },
      {
        user_id: 'user5',
        title: '추가 배송 구매 문의',
        content:
          '현재 남은 배송 횟수를 다 소진했는데 추가로 구매하고 싶습니다. 어떻게 해야 하나요?',
        answer:
          '마이페이지 > 구독/결제 메뉴에서 추가 배송을 구매하실 수 있습니다. 감사합니다.',
        status: 'answered',
        answered_at: new Date(
          today.getTime() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(), // 2일 전
      },
    ];

    for (const inquiry of inquiries) {
      await run(
        "INSERT INTO inquiries (user_id, title, content, answer, status, created_at, answered_at) VALUES (?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), ?)",
        [
          inquiry.user_id,
          inquiry.title,
          inquiry.content,
          inquiry.answer,
          inquiry.status,
          Math.floor(Math.random() * 7) + 3, // 3-10일 전에 생성된 것으로 설정
          inquiry.answered_at,
        ]
      );
    }
    console.log('고객의 소리 데이터가 생성되었습니다.');

    // SMS 로그 데이터 삽입
    const smsLogs = [
      {
        recipient: '01023456789', // user1
        message:
          '안녕하세요 홍길동님, 오늘 배송이 예정되어 있습니다. 오전 중으로 도착 예정입니다.',
        type: 'delivery_notice',
      },
      {
        recipient: '01034567890', // user2
        message:
          '안녕하세요 김철수님, 오늘 배송이 예정되어 있습니다. 오전 중으로 도착 예정입니다.',
        type: 'delivery_notice',
      },
      {
        recipient: '01045678901', // user3
        message:
          '안녕하세요 이영희님, 오늘 배송이 예정되어 있습니다. 오전 중으로 도착 예정입니다.',
        type: 'delivery_notice',
      },
      {
        recipient: '01056789012', // user4
        message:
          '안녕하세요 박민준님, 오늘 배송이 예정되어 있습니다. 오전 중으로 도착 예정입니다.',
        type: 'delivery_notice',
      },
      {
        recipient: '01067890123', // user5
        message:
          '안녕하세요 정수민님, 오늘 배송이 예정되어 있습니다. 오전 중으로 도착 예정입니다.',
        type: 'delivery_notice',
      },
      {
        recipient: '01023456789', // user1
        message:
          '홍길동님, 배송 잔여 횟수가 5회 남았습니다. 추가 구매를 원하시면 앱을 확인해주세요.',
        type: 'reminder',
      },
      {
        recipient: '01034567890', // user2
        message:
          '김철수님, 다음주 월요일 이후로 새로운 상품이 출시될 예정입니다. 기대해주세요!',
        type: 'marketing',
      },
    ];

    for (const sms of smsLogs) {
      await run(
        "INSERT INTO sms_logs (recipient, message, type, sent_at) VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))",
        [
          sms.recipient,
          sms.message,
          sms.type,
          Math.floor(Math.random() * 24), // 0-24시간 전에 보낸 것으로 설정
        ]
      );
    }
    console.log('SMS 로그 데이터가 생성되었습니다.');

    // 사용자별 상품 배송 잔여 횟수 데이터 생성
    // 사용자별로 상품 구매 및 배송 현황을 분석하여 잔여 횟수 계산

    // 1. 각 사용자의 상품별 배송 횟수 계산
    const userProductMap = {}; // 사용자별 상품 배송 현황 맵

    // 배송 목록에서 사용자-상품별로 완료된 배송 수 계산
    const deliveryCount = await all(`
      SELECT user_id, product_id, COUNT(*) as count 
      FROM delivery_list 
      WHERE status = 'complete' 
      GROUP BY user_id, product_id
    `);

    // 결제 정보에서 사용자-상품별로 구매한 배송 횟수 계산
    const paymentInfo = await all(`
      SELECT p.user_id, p.product_id, SUM(p.count * pr.delivery_count) as total_delivery_count
      FROM payments p
      JOIN product pr ON p.product_id = pr.id
      GROUP BY p.user_id, p.product_id
    `);
    // 각 사용자별 상품별 잔여 배송 횟수 계산
    for (const payment of paymentInfo) {
      const { user_id, product_id, total_delivery_count } = payment;

      // 해당 사용자-상품의 완료된 배송 수 찾기
      const completedDelivery = deliveryCount.find(
        (d) => d.user_id === user_id && d.product_id === product_id
      );

      const usedCount = completedDelivery ? completedDelivery.count : 0;
      const remainingCount = total_delivery_count - usedCount;

      // 맵에 추가
      if (!userProductMap[user_id]) {
        userProductMap[user_id] = {};
      }

      userProductMap[user_id][product_id] = remainingCount;
    }

    // 2. 현재 대기 중인(pending) 배송도 계산에 포함
    const pendingDeliveries = await all(`
  SELECT user_id, product_id, COUNT(*) as count 
  FROM delivery_list 
  WHERE status = 'pending' 
  GROUP BY user_id, product_id
`);

    for (const pending of pendingDeliveries) {
      const { user_id, product_id, count } = pending;

      // 이미 결제 내역이 있는 사용자-상품인 경우만 처리
      if (
        userProductMap[user_id] &&
        userProductMap[user_id][product_id] !== undefined
      ) {
        // 대기 중인 배송 수만큼 잔여 횟수에서 차감
        userProductMap[user_id][product_id] -= count;

        // 음수가 되지 않도록 보정
        if (userProductMap[user_id][product_id] < 0) {
          userProductMap[user_id][product_id] = 0;
        }
      }
    }

    // 3. user_product_delivery 테이블에 데이터 삽입
    for (const userId in userProductMap) {
      for (const productId in userProductMap[userId]) {
        const remainingCount = userProductMap[userId][productId];

        // 0보다 큰 잔여 횟수만 저장
        if (remainingCount > 0) {
          await run(
            `INSERT INTO user_product_delivery (user_id, product_id, remaining_count, created_at, updated_at) 
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [userId, productId, remainingCount]
          );
        }
      }
    }

    // 4. 추가 테스트 데이터: 몇몇 사용자에게 여러 상품의 배송 횟수 추가
    const additionalProductDeliveries = [
      { user_id: 'user1', product_id: 2, remaining_count: 3 }, // user1에게 기본 세트 3회 추가
      { user_id: 'user1', product_id: 4, remaining_count: 2 }, // user1에게 고급 채소 세트 2회 추가
      { user_id: 'user2', product_id: 3, remaining_count: 4 }, // user2에게 신선 과일 세트 4회 추가
      { user_id: 'user3', product_id: 2, remaining_count: 6 }, // user3에게 기본 세트 6회 추가
      { user_id: 'user3', product_id: 5, remaining_count: 3 }, // user3에게 간식 세트 3회 추가
      { user_id: 'user4', product_id: 2, remaining_count: 5 }, // user4에게 기본 세트 5회 추가
      { user_id: 'user4', product_id: 3, remaining_count: 2 }, // user4에게 신선 과일 세트 2회 추가
      { user_id: 'user5', product_id: 1, remaining_count: 1 }, // user5에게 프리미엄 세트 1회 추가
      { user_id: 'user5', product_id: 5, remaining_count: 3 }, // user5에게 간식 세트 3회 추가
    ];

    for (const delivery of additionalProductDeliveries) {
      // 이미 있는 데이터면 업데이트, 없으면 삽입
      await run(
        `INSERT INTO user_product_delivery (user_id, product_id, remaining_count, created_at, updated_at) 
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, product_id) 
     DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
        [
          delivery.user_id,
          delivery.product_id,
          delivery.remaining_count,
          delivery.remaining_count,
        ]
      );
    }

    console.log('사용자별 상품 배송 잔여 횟수 데이터가 생성되었습니다.');

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
