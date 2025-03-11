// routes/example.js
const express = require("express");
const router = express.Router();

// post
router.post("/", (req, res) => {
  res.send("POST request to the homepage");
});

// get
router.get("/", (req, res) => {
  res.send("GET request to the homepage");
});

module.exports = router;
