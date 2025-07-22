/*
-- 사용자 테이블 (users)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  delivery_count INTEGER DEFAULT 0,
  phone_number TEXT
);

-- 배달 목록 테이블 (delivery_list)
CREATE TABLE IF NOT EXISTS delivery_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL,
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL
);

-- 상품 테이블 (product)
CREATE TABLE IF NOT EXISTS product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL
);

-- 공지 테이블 (notice)
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT
);

-- 고객의 소리 테이블 (inquiries)
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  category TEXT CHECK(category IN ('general', 'catering')) NOT NULL DEFAULT 'general',
  status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP
);

*/
