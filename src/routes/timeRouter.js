const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  formatTimeToMinutes,
  formatMinutesToTime,
  compareTimes,
  validateTime,
  calculateTravelTime,
  checkTimeInRange,
  getTimeInfo,
  getCurrentTime,
} = require("../controllers/timeController");

// Format thời gian từ HH:mm sang phút
router.post("/format-to-minutes", verifyToken, formatTimeToMinutes);

// Format thời gian từ phút sang HH:mm
router.post("/format-to-time", verifyToken, formatMinutesToTime);

// So sánh 2 thời gian
router.post("/compare", verifyToken, compareTimes);

// Validate và format thời gian
router.post("/validate", verifyToken, validateTime);

// Tính toán thời gian đi lại
router.post("/calculate-travel", verifyToken, calculateTravelTime);

// Kiểm tra thời gian có nằm trong khoảng không
router.post("/check-range", verifyToken, checkTimeInRange);

// Lấy thông tin thời gian chi tiết
router.get("/info/:time", verifyToken, getTimeInfo);

// Lấy thời gian hiện tại
router.get("/current", verifyToken, getCurrentTime);

module.exports = router;
