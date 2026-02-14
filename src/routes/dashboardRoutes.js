const express = require("express");
const router = express.Router();
const {protect} = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {getDashboardTotals} = require("../controller/dashboardController");

// Semua route hanya untuk admin
router.get("/totals", protect, role("admin"), getDashboardTotals);

module.exports = router;
