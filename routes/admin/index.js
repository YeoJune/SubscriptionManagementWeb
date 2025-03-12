// routes/admin/index.js
const express = require("express");
const router = express.Router();

// import subrouter
const userRoutes = require("./userRoutes");
const boardRoutes = require("./boardRoutes");

// connect /admin/users -> userRoutes
router.use("/users", userRoutes);
router.use("/boards", boardRoutes);

module.exports = router;

