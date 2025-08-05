// lib/auth.js
const crypto = require('crypto');

// 솔트 생성
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

// 비밀번호 해싱
const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

// 비밀번호 검증
const verifyPassword = (password, hash, salt) => {
  const hashedPassword = hashPassword(password, salt);
  return hash === hashedPassword;
};

const authMiddleware = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

const optionalAuthMiddleware = (req, res, next) => {
  if (req.session.user) {
    req.user = req.session.user;
  }
  next();
};

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  authMiddleware,
  optionalAuthMiddleware,
};
