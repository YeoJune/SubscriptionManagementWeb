// routes/auth/index.js 
const express = require("express");
const router = express.Router();
const authMiddlewarre = require("../../lib/auth");

// POST /auth/signup
router.post("/signup", (req, res) => {
  // TODO: implement signup
  res.send("signup");
});

// POST /auth/login
router.post("/login", (req, res) => {
  // TODO: implement login
  res.send("login");
});

// POST /auth/logout
router.post("/logout", authMiddlewarre, (req, res) => {
  // TODO: implement logout
  res.send("logout");
});

// GET /auth/profile
router.get("/profile", authMiddlewarre, (req, res) => {
  // TODO: implement profile 
  res.send("profile");
});

// PUT /auth/profile
router.put("/profile", authMiddlewarre, (req, res) => {
  // TODO: implement profile update
  res.send("profile update");
});

module.exports = router;
