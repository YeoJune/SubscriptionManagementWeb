// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const exampleRouter = require("./routes/example");

const app = express();
const server = http.createServer(app);

app.use(cors());

app.use("/example", exampleRouter);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/pages/index.html");
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
