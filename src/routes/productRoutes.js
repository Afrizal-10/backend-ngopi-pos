// routes/productRoutes.js - Tambahkan route baru

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getTotalProducts,
  getBestSellingProducts,
  getSalesByCategory,
  getSalesTrend,
} = require("../controller/productController");

router.get("/count", getTotalProducts);
router.get("/", getProducts);
router.post("/", upload.single("image"), createProduct);
router.put("/:id", upload.single("image"), updateProduct);
router.delete("/:id", deleteProduct);
router.get("/best-selling", getBestSellingProducts);
router.get("/sales-by-category", getSalesByCategory);
router.get("/sales-trend", getSalesTrend);

module.exports = router;
