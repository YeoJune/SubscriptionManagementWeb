// routes/admin/index.js
const express = require("express");
const router = express.Router();

// import subrouter
const userRoutes = require("./userRoutes");
const boardRoutes = require("./boardRoutes");
const paymentsRoutes = require("./paymentsRoutes");
const deliveryRoutes = require("./deliveryRoutes");
const menuManageRotues = require("./menuManageRoutes");
const notificationsRoutes = require("./notificationsRoutes");
const statisticsRoutes = require("./statisticsRoutes");

// connect /admin/users -> userRoutes
router.use("/users", userRoutes);
router.use("/boards", boardRoutes);
router.use("/payments", paymentsRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/menu", menuManageRotues);
router.use("/notifications", notificationsRoutes);
router.use("/statistics", statisticsRoutes);

module.exports = router;

