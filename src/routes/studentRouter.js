const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  updateStudent,
  getStudent,
  addTuitionFee,
  getAchievement,
  getCutRice,
  createCutRice,
  updateCutRice,
  deleteCutRice,
  getTuitionFee,
  getLearningInformation,
  addLearningInformation,
  getTimeTable,
  createTimeTable,
  deleteTuitionFee,
  deleteLearningInformation,
  deleteTimeTable,
  updateTuitionFee,
  updateTimeTable,
  updateLearningResult,
} = require("../controllers/studentController");

router.get("/:userId", verifyToken, getStudent);
router.put("/:studentId", verifyToken, updateStudent);
router.get("/:userId/achievement", verifyToken, getAchievement);

//CRUD with time_table
router.get("/:userId/time-table", verifyToken, getTimeTable);
router.post("/:userId/time-table", verifyToken, createTimeTable);
router.delete("/:userId/time-table/:timeTableId", verifyToken, deleteTimeTable);
router.put("/time-table/:timeTableId", verifyToken, updateTimeTable);

//CRUD with learning_information
router.get(
  "/:userId/learning-information",
  verifyToken,
  getLearningInformation
);
router.post(
  "/:userId/learning-information",
  verifyToken,
  addLearningInformation
);
router.delete(
  "/:userId/learning-information/:learnId",
  verifyToken,
  deleteLearningInformation
);
router.put(
  "/:userId/learningResult/:learnId",
  verifyToken,
  updateLearningResult
);

//CRUD with tuitionFee
router.get("/:userId/tuition-fee", verifyToken, getTuitionFee);
router.post("/:userId/tuition-fee", verifyToken, addTuitionFee);
router.delete("/:userId/tuitionFee/:feeId", verifyToken, deleteTuitionFee);
router.put("/:userId/tuitionFee/:tuitionFeeId", verifyToken, updateTuitionFee);

// CRUD with cutRice
router.get("/:userId/cut-rice", verifyToken, getCutRice);
router.put("/:userId/cut-rice/:cutRiceId", verifyToken, updateCutRice);
router.post("/:userId/cut-rice", verifyToken, createCutRice);
router.delete("/:userId/cut-rice/:cutRiceId", verifyToken, deleteCutRice);

module.exports = router;
