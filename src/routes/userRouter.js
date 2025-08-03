const router = require("express").Router();
const {
  Register,
  Login,
  Logout,
  changePassword,
} = require("../controllers/authController");
const {
  getUser,
  updateCommanderDutySchedule,
  createCommanderDutySchedule,
  deleteCommanderDutySchedule,
  getCommanderDutySchedules,
  getCommanderDutySchedule,
  getCommanderDutySchedulesCurrent,
  getCommanderDutyScheduleByUserId,
  getGuards,
  createguard,
  updateGuard,
  deleteGuard,
  getListGuard,
  getGuardDetail,
} = require("../controllers/userController");
const { resetPassword, forgotPassword } = require("../services/forgotPassword");
const { verifyToken, isAdmin } = require("../middlewares/verify");

// Auth with user
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/register", Register);
router.post("/login", Login);
router.post("/logout", verifyToken, Logout);

//CRUD with guard
router.get("/guard", verifyToken, getGuards);
router.get("/listGuard", verifyToken, isAdmin, getListGuard);
router.get("/guard/:dayGuard", verifyToken, isAdmin, getGuardDetail);
router.post("/guard", verifyToken, isAdmin, createguard);
router.put("/guard/:guardId", verifyToken, isAdmin, updateGuard);
router.delete("/guard/:date", verifyToken, isAdmin, deleteGuard);

//CRUD with commander_duty_schedule
router.get("/commanderDutySchedules", verifyToken, getCommanderDutySchedules);
router.get("/commanderDutySchedule", verifyToken, getCommanderDutySchedule);
router.get(
  "/commanderDutySchedule/:id",
  verifyToken,
  getCommanderDutyScheduleByUserId
);
router.put(
  "/commanderDutySchedule/:id",
  verifyToken,
  isAdmin,
  updateCommanderDutySchedule
);
router.post(
  "/commanderDutySchedule",
  verifyToken,
  isAdmin,
  createCommanderDutySchedule
);
router.delete(
  "/commanderDutySchedule/:id",
  verifyToken,
  isAdmin,
  deleteCommanderDutySchedule
);
router.get(
  "/commanderDutyScheduleCurrent",
  verifyToken,
  getCommanderDutySchedulesCurrent
);

// CRUD with user
router.put("/:userId", verifyToken, changePassword);
router.get("/:userId", verifyToken, getUser);

module.exports = router;
