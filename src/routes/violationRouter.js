const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  getStudentViolations,
  getViolationsByYearAndSemester,
  addViolation,
  updateViolation,
  deleteViolation,
  getViolationStats,
  getAllViolations,
} = require("../controllers/violationController");

// Lấy tất cả vi phạm của student
router.get("/:userId", verifyToken, getStudentViolations);

// Lấy vi phạm theo năm và học kỳ
router.get("/:userId/:year/:semester", verifyToken, getViolationsByYearAndSemester);

// Lấy vi phạm theo năm (không phân học kỳ)
router.get("/:userId/:year", verifyToken, getViolationsByYearAndSemester);

// Thêm vi phạm mới (Admin)
router.post("/:userId", verifyToken, addViolation);

// Cập nhật vi phạm
router.put("/:violationId", verifyToken, updateViolation);

// Xóa vi phạm
router.delete("/:violationId", verifyToken, deleteViolation);

// Lấy thống kê vi phạm
router.get("/:userId/stats", verifyToken, getViolationStats);

// Lấy tất cả vi phạm (cho admin)
router.get("/", verifyToken, getAllViolations);

module.exports = router; 