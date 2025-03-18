// lib/db.js
const sqlite3 = require("sqlite3").verbose();

// 데이터베이스 연결
const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("데이터베이스 연결 오류:", err.message);
  } else {
    console.log("SQLite 데이터베이스에 연결되었습니다.");

    // 사용자 테이블 생성
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        delivery_count INTEGER DEFAULT 0,
        phone_number TEXT
      )
    `);
  }
});

module.exports = db;
