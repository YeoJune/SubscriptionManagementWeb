// routes/admin.js/notificationsRoutes.js
const express = require("express");
const router = express.Router();
const checkAdmin = require("../../lib/checkAdmin");

// POST /admin/notificationds/delivery-complete
router.post("/delivery-complete", checkAdmin, (req, res) => {
  // TODO: implement delivery complete notification
  //
  res.send("delivery complete notification");
});

// POST /admin/notifications/remaining-count
router.post("/remaining-count", checkAdmin, (req, res) => {
  // TODO: implement remaining count notification
  res.send("remaining count notification");
});

module.exports = router;

