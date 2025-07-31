// lib/db.js
const sqlite3 = require('sqlite3').verbose();

// 데이터베이스 연결
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('데이터베이스 연결 오류:', err.message);
  } else {
    console.log('SQLite 데이터베이스에 연결되었습니다.');
  }
});

// 모든 테이블 스키마 한번에 생성
function initDatabase() {
  // 사용자 테이블
  db.run(`
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

  // 상품 테이블
  db.run(`
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

  // 공지사항 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS notice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      question TEXT,
      answer TEXT,
      images TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 결제 테이블
  db.run(`
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
      depositor_name TEXT,
      cancelled_reason TEXT,
      paid_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 배송 목록 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS delivery_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL DEFAULT 'pending',
      date TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      special_request TEXT
    )
  `);

  // SMS 로그 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 고객의 소리 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      answer TEXT,
      status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
      category TEXT CHECK(category IN ('general', 'catering')) NOT NULL DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      answered_at TIMESTAMP
    )
  `);

  // 사용자별 상품 배송 잔여 횟수 테이블
  db.run(`
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

  // 히어로 슬라이드 테이블
  db.run(`
    CREATE TABLE IF NOT EXISTS hero_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      images TEXT,
      is_active BOOLEAN DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('데이터베이스 테이블 초기화 완료');
}

// 데이터베이스 초기화
initDatabase();

module.exports = db;
