// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

app.use(cors());

// React 빌드 파일을 정적 파일로 서빙
app.use(express.static(path.join(__dirname, "pages")));

// React Router 사용 등 클라이언트 측 라우팅을 위해
// 존재하지 않는 모든 요청을 React의 index.html로 보내기
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
