const express = require("express");
const router = express.Router();
const {protect, admin} = require("../middleware/authMiddleware");
const {
  getSalesReport,
  getDailyStatsCashier,
  getRecentTransactions,
  getWeeklyPerformance,
  getSalesData,
  getDailyStats,
} = require("../controller/reportController");

router.get("/sales-summary", protect, admin, getSalesReport);
router.get("/sales-chart", protect, getSalesData);
router.get("/daily-stats-cashier", protect, getDailyStatsCashier);
router.get("/recent", protect, getRecentTransactions);
router.get("/performance/weekly", protect, getWeeklyPerformance);
router.get("/daily-stats", protect, getDailyStats);

module.exports = router;
