const express = require("express");
const router = express.Router();
const {protect} = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");
const {
  createKasir,
  getAllKasir,
  updateKasir,
  deleteKasir,
  getTotalKasir,
  getMyProfile,
  updateMyProfile,
} = require("../controller/kasirController");

router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);

// Semua route hanya untuk admin
router.use(protect, role("admin"));
router.get("/count", getTotalKasir);
router.post("/", createKasir);
router.get("/", getAllKasir);
router.put("/:id", updateKasir);
router.delete("/:id", deleteKasir);

module.exports = router;
