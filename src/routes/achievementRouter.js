const router = require("express").Router();
const { verifyToken, isAdmin } = require("../middlewares/verify");
const {
  getStudentAchievement,
  getAllAchievements,
  getStudentsForAdmin,
  addYearlyAchievement,
  addYearlyAchievementByAdmin,
  updateYearlyAchievement,
  updateYearlyAchievementByAdmin,
  deleteYearlyAchievement,
  deleteYearlyAchievementByAdmin,
  getRecommendations,
} = require("../controllers/achievementController");

// Routes cho admin (phải đặt trước user routes để tránh conflict)
// Lấy danh sách tất cả achievement
router.get("/admin/all", verifyToken, isAdmin, getAllAchievements);

// Lấy danh sách học viên cho admin
router.get("/admin/students", verifyToken, isAdmin, getStudentsForAdmin);

// Thêm khen thưởng cho học viên (admin)
router.post(
  "/admin/:studentId",
  verifyToken,
  isAdmin,
  addYearlyAchievementByAdmin
);

// Cập nhật khen thưởng cho học viên (admin)
router.put(
  "/admin/:studentId/:year",
  verifyToken,
  isAdmin,
  updateYearlyAchievementByAdmin
);

// Xóa khen thưởng cho học viên (admin)
router.delete(
  "/admin/:studentId/:year",
  verifyToken,
  isAdmin,
  deleteYearlyAchievementByAdmin
);

// Routes cho học viên
// Lấy thông tin khen thưởng của student
router.get("/:userId", verifyToken, getStudentAchievement);

// Thêm khen thưởng mới
router.post("/:userId", verifyToken, addYearlyAchievement);

// Cập nhật khen thưởng theo năm
router.put("/:userId/:year", verifyToken, updateYearlyAchievement);

// Xóa khen thưởng theo năm
router.delete("/:userId/:year", verifyToken, deleteYearlyAchievement);

// Lấy đề xuất khen thưởng cho năm tiếp theo
router.get("/:userId/recommendations", verifyToken, getRecommendations);

module.exports = router;
