// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);

const session = require('express-session');
// 공통 미들웨어
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' },
  })
);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// React 빌드 파일을 정적 파일로 서빙
app.use(express.static(path.join(__dirname, 'dist')));

// public 폴더를 정적 파일로 서빙
app.use('/public', express.static(path.join(__dirname, 'public')));

// API 라우트
app.use('/api', require('./routes'));

// React Router 사용 등 클라이언트 측 라우팅을 위해
// 존재하지 않는 모든 요청을 React의 index.html로 보내기
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
