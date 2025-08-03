const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  getStudentGrades,
  getSemesterGrades,
  addSemesterGrades,
  updateSemesterGrades,
  deleteSemesterGrades,
  getGradeInfo,
  convertGrade,
  calculateAverage,
} = require("../controllers/gradeController");

// Lấy kết quả học tập của sinh viên
router.get("/:userId", verifyToken, getStudentGrades);

// Lấy kết quả học tập theo học kỳ
router.get("/:userId/:semester/:schoolYear", verifyToken, getSemesterGrades);

// Thêm kết quả học tập cho học kỳ
router.post("/:userId", verifyToken, addSemesterGrades);

// Cập nhật kết quả học tập cho học kỳ
router.put("/:userId/:semester/:schoolYear", verifyToken, updateSemesterGrades);

// Xóa kết quả học tập cho học kỳ
router.delete(
  "/:userId/:semester/:schoolYear",
  verifyToken,
  deleteSemesterGrades
);

// Lấy thông tin điểm
router.get("/info/:letterGrade", verifyToken, getGradeInfo);

// Chuyển đổi điểm
router.post("/convert", verifyToken, convertGrade);

// Tính điểm trung bình
router.post("/average", verifyToken, calculateAverage);

module.exports = router;
