const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransactionDetail,
  getTotalTransactions,
  deleteTransaction,
  getReceiptPublic,
  getKasirTransactions,
  cancelTransactionKasir,
  getPaymentMethodStats,
} = require("../controller/transactionController");

const {protect, admin} = require("../middleware/authMiddleware");

// Kasir
router.get("/count", protect, getTotalTransactions);
router.post("/", protect, createTransaction);
router.get("/payment-methods", protect, getPaymentMethodStats);

// kasir riwayat
router.get("/kasir/history", protect, getKasirTransactions);

// kasir cancel
router.put("/kasir/:id/cancel", protect, cancelTransactionKasir);
// admin
router.get("/", protect, admin, getTransactions);
router.delete("/:id", protect, admin, deleteTransaction);
router.get("/receipt/:invoice", getReceiptPublic);
router.get("/:invoice", protect, getTransactionDetail);

module.exports = router;
