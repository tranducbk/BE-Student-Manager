const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  getAllStudentsWithHierarchy,
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
  deleteTuitionFee,
  deleteLearningInformation,
  updateTuitionFee,
  updateLearningResult,
  createAutoCutRice,
  updateAutoCutRice,
  resetAutoCutRice,
  updateManualCutRice,
} = require("../controllers/studentController");

// Import từ các controller đã tách
const {
  getTimeTable,
  createTimeTable,
  deleteTimeTable,
  updateTimeTable,
} = require("../controllers/timeTableController");

const {
  getUniversityHierarchy,
  getOrganizationsByUniversity,
  getEducationLevelsByOrganization,
  getClassesByEducationLevel,
  createOrganization,
  createEducationLevel,
  createClass,
  updateOrganization,
  updateEducationLevel,
  updateClass,
  deleteOrganization,
  deleteEducationLevel,
  deleteClass,
} = require("../controllers/universityController");

// Student routes
router.get("/all", verifyToken, getAllStudentsWithHierarchy);
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

// Auto cut rice routes
router.post("/:userId/auto-cut-rice", verifyToken, createAutoCutRice);
router.put("/:userId/auto-cut-rice", verifyToken, updateAutoCutRice);
router.put("/:userId/reset-cut-rice", verifyToken, resetAutoCutRice);
router.put("/:userId/manual-cut-rice", verifyToken, updateManualCutRice);

// University hierarchy
router.get(
  "/university/:universityId/hierarchy",
  verifyToken,
  getUniversityHierarchy
);

// Organization routes
router.get(
  "/university/:universityId/organizations",
  verifyToken,
  getOrganizationsByUniversity
);
router.post("/organizations", verifyToken, createOrganization);
router.put("/organizations/:organizationId", verifyToken, updateOrganization);
router.delete(
  "/organizations/:organizationId",
  verifyToken,
  deleteOrganization
);

// Education Level routes
router.get(
  "/organizations/:organizationId/education-levels",
  verifyToken,
  getEducationLevelsByOrganization
);
router.post("/education-levels", verifyToken, createEducationLevel);
router.put(
  "/education-levels/:educationLevelId",
  verifyToken,
  updateEducationLevel
);
router.delete(
  "/education-levels/:educationLevelId",
  verifyToken,
  deleteEducationLevel
);

// Class routes
router.get(
  "/education-levels/:educationLevelId/classes",
  verifyToken,
  getClassesByEducationLevel
);
router.post("/classes", verifyToken, createClass);
router.put("/classes/:classId", verifyToken, updateClass);
router.delete("/classes/:classId", verifyToken, deleteClass);

module.exports = router;
