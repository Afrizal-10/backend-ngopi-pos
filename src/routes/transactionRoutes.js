const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransactionDetail,
  cancelTransaction,
  getTotalTransactions,
  deleteTransaction,
  getReceiptPublic,
} = require("../controller/transactionController");

const {protect, admin} = require("../middleware/authMiddleware");

// Kasir
router.get("/count", protect, getTotalTransactions);
router.post("/", protect, createTransaction);
// admin
router.get("/", protect, admin, getTransactions);
router.put("/:id/cancel", protect, admin, cancelTransaction);
router.delete("/:id", protect, admin, deleteTransaction);
router.get("/receipt/:invoice", getReceiptPublic);
router.get("/:invoice", protect, getTransactionDetail);

module.exports = router;
