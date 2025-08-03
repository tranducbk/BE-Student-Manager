const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  getStudentAchievement,
  addYearlyAchievement,
  updateYearlyAchievement,
  deleteYearlyAchievement,
  getRecommendations,
} = require("../controllers/achievementController");

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