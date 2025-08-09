const router = require("express").Router();
const { verifyToken, isAdmin } = require("../middlewares/verify");
const {
  getAllSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
} = require("../controllers/semesterController");

// Danh sách kỳ + search q
router.get("/", verifyToken, getAllSemesters);

// Lấy 1 kỳ
router.get("/:id", verifyToken, getSemesterById);

// Tạo kỳ (Admin only)
router.post("/create", verifyToken, isAdmin, createSemester);

// Cập nhật kỳ (Admin only)
router.put("/:id", verifyToken, isAdmin, updateSemester);

// Xóa kỳ (Admin only)
router.delete("/:id", verifyToken, isAdmin, deleteSemester);

module.exports = router;
