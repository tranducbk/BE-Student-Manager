const router = require("express").Router();
const { verifyToken, isAdmin } = require("../middlewares/verify");
const {
  getStudentGrades,
  getSemesterGrades,
  addSemesterGrades,
  updateSemesterGrades,
  deleteSemesterGrades,
  deleteYearlyResult,
  recalculateAllYearlyResultsAPI,
  getGradeInfo,
  convertGrade,
  calculateAverage,
  getSemesterGradesByStudentId,
} = require("../controllers/gradeController");

// Lấy kết quả học tập của sinh viên
router.get("/:userId", verifyToken, getStudentGrades);

// Lấy kết quả học tập theo học kỳ
router.get("/:userId/:semester/:schoolYear", verifyToken, getSemesterGrades);

// Lấy kết quả học tập theo học kỳ cho admin (sử dụng studentId)
router.get(
  "/student/:studentId/:semester/:schoolYear",
  verifyToken,
  isAdmin,
  getSemesterGradesByStudentId
);

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

// Xóa kết quả năm học và tất cả học kỳ thuộc năm đó
router.delete("/yearly/:userId/:schoolYear", verifyToken, deleteYearlyResult);

// Tính toán lại CPA cho tất cả các năm học
router.post(
  "/recalculate/:userId",
  verifyToken,
  recalculateAllYearlyResultsAPI
);

// Lấy thông tin điểm
router.get("/info/:letterGrade", verifyToken, getGradeInfo);

// Chuyển đổi điểm
router.post("/convert", verifyToken, convertGrade);

// Tính điểm trung bình
router.post("/average", verifyToken, calculateAverage);

module.exports = router;
