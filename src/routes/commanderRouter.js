const multer = require("multer");
const router = require("express").Router();
// const Student = require("../models/student");
const { verifyToken, isAdmin } = require("../middlewares/verify");
const { updateStudent } = require("../controllers/studentController");
const {
  updateCommander,
  getCommander,
  deleteStudent,
  getStudents,
  getAllStudent,
  getCommanders,
  deleteCommander,
  createCommander,
  createStudent,
  updateAchievement,
  getAchievements,
  deleteAchievement,
  createAchievement,
  getHelpCooking,
  updateHelpCooking,
  deleteHelpCooking,
  createHelpCooking,
  getPhysicalResult,
  updatePhysicalResult,
  deletePhysicalResult,
  createPhysicalResult,
  createVacationSchedule,
  getVacationSchedule,
  getViolation,
  createViolation,
  deleteViolation,
  getAllCutRice,
  getTuitionFees,
  getLearningResults,
  getVacationSchedules,
  getPhysicalResults,
  getViolations,
  getRegulatoryDocuments,
  getRegulatoryDocument,
  getTimeTables,
  deleteVacationSchedule,
  updateVacationSchedule,
  updateViolation,
  getTimeTable,
  getStudent,
  getHelpCookings,
  getVacationScheduleByDate,
  getHelpCookingByDate,
  getAllCutRiceByDate,
  getLearningResultAll,
  getLearningClassification,
  getLearningResultBySemester,
  getListSuggestedReward,
  getTopStudentsByLatestYear,
  getTopStudentsByLatestSemester,
  createNotification,
  updateIsRead,
  getStudentNotifications,
  deleteNotification,
  updateNotification,
  getExcelCutRice,
  getExcelCutRiceWithSchedule,
  updateStudentRating,
  getAvailableYears,
  getYearlyResults,
  getPdfLearningResult,
  getPdfPhysicalResutl,
  getPdfTuitionFee,
  getListSuggestedRewardWord,
  updateStudentCutRice,
  generateAutoCutRiceForAllStudents,
  getCutRiceDetail,
  generateAutoCutRiceForStudent,
  getAllStudentsGrades,
  getYearlyStatistics,
  getPartyRatings,
  getTrainingRatings,
  getWordTuitionFee,
  updateTuitionFeeStatus,
  getGraduatedStudents,
  getAllStudents,
  getEnrollmentYears,
  getSchoolYears,
  bulkUpdateGraduationDate,
  getExcelPoliticalManagement,
  getAvailableSchoolYearsForPoliticalManagement,
  getExcelTimeTableWithCutRice,
} = require("../controllers/commanderController");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Export to Word
router.get(
  "/listSuggestedReward/word",
  verifyToken,
  isAdmin,
  getListSuggestedRewardWord
);
// Export to Excel
router.get("/cutRice/excel", verifyToken, isAdmin, getExcelCutRice);
router.get(
  "/cutRice/excel-with-schedule",
  verifyToken,
  isAdmin,
  getExcelCutRiceWithSchedule
);
router.get(
  "/political-management/excel",
  verifyToken,
  isAdmin,
  getExcelPoliticalManagement
);
router.get(
  "/political-management/school-years",
  verifyToken,
  isAdmin,
  getAvailableSchoolYearsForPoliticalManagement
);

router.get(
  "/time-table-with-cut-rice/excel",
  verifyToken,
  isAdmin,
  getExcelTimeTableWithCutRice
);

// Update student rating
router.put(
  "/updateStudentRating/:yearlyResultId",
  verifyToken,
  isAdmin,
  updateStudentRating
);

// Yearly statistics
router.get("/yearlyResults/years", verifyToken, isAdmin, getAvailableYears);
router.get("/yearlyResults", verifyToken, isAdmin, getYearlyResults);

// Export to Pdf
router.get("/learningResult/pdf", verifyToken, isAdmin, getPdfLearningResult);
router.get("/physicalResult/pdf", verifyToken, isAdmin, getPdfPhysicalResutl);
router.get("/tuitionFee/pdf", verifyToken, isAdmin, getPdfTuitionFee);
router.get("/tuitionFee/word", verifyToken, isAdmin, getWordTuitionFee);

//CRUD with Notifications
router.put("/notification/:userId/:notificationId", verifyToken, updateIsRead);
router.get(
  "/studentNotifications/:userId",
  verifyToken,
  getStudentNotifications
);

// CRUD with regulatoryDocuments
router.post(
  "/notification",
  upload.single("attachments"),
  verifyToken,
  isAdmin,
  createNotification
);
router.delete(
  "/notification/:notificationId",
  verifyToken,
  isAdmin,
  deleteNotification
);
router.put(
  "/notification/:notificationId",
  upload.single("attachments"),
  verifyToken,
  isAdmin,
  updateNotification
);
router.get("/regulatory_documents", verifyToken, getRegulatoryDocuments);
router.get(
  "/regulatory_documents/:regulatoryDocumentId",
  verifyToken,
  getRegulatoryDocument
);

//CRUD with violation
router.get("/violation/:userId", verifyToken, getViolation);
router.get("/violations", verifyToken, isAdmin, getViolations);
router.post("/violation", verifyToken, isAdmin, createViolation);
router.delete(
  "/:studentId/violation/:violationId",
  verifyToken,
  isAdmin,
  deleteViolation
);
router.put("/violation/:violationId", verifyToken, isAdmin, updateViolation);

//CRUD with vacationSchedule
router.get("/vacationSchedule/:userId", verifyToken, getVacationSchedule);
router.get("/vacationSchedules", verifyToken, isAdmin, getVacationSchedules);
router.get(
  "/vacationScheduleByDate",
  verifyToken,
  isAdmin,
  getVacationScheduleByDate
);
router.post("/vacationSchedule", verifyToken, isAdmin, createVacationSchedule);
router.delete(
  "/:studentId/vacationSchedule/:vacationScheduleId",
  verifyToken,
  isAdmin,
  deleteVacationSchedule
);
router.put(
  "/vacationSchedule/:vacationScheduleId",
  verifyToken,
  isAdmin,
  updateVacationSchedule
);

//CRUD with physicalResult
router.get("/physicalResult/:userId", verifyToken, getPhysicalResult);
router.get("/physicalResults", verifyToken, isAdmin, getPhysicalResults);
router.put(
  "/:studentId/physicalResult/:physicalResultId",
  verifyToken,
  isAdmin,
  updatePhysicalResult
);
router.delete(
  "/physicalResult/:studentId/:physicalResultId",
  verifyToken,
  isAdmin,
  deletePhysicalResult
);
router.post("/physicalResult", verifyToken, isAdmin, createPhysicalResult);

//CRUD with helpCooking
router.get("/helpCooking/:userId", verifyToken, getHelpCooking);
router.get("/helpCooking", verifyToken, isAdmin, getHelpCookings);
router.get("/helpCookingByDate", verifyToken, isAdmin, getHelpCookingByDate);
router.put(
  "/:studentId/helpCooking/:helpCookingId",
  verifyToken,
  isAdmin,
  updateHelpCooking
);
router.delete(
  "/:studentId/helpCooking/:helpCookingId",
  verifyToken,
  isAdmin,
  deleteHelpCooking
);
router.post("/helpCooking", verifyToken, isAdmin, createHelpCooking);

//CRUD with achievement
router.put(
  "/:studentId/achievement/:achievementId",
  verifyToken,
  isAdmin,
  updateAchievement
);
router.get("/achievements", verifyToken, isAdmin, getAchievements);
router.delete(
  "/achievement/:studentId/:achievementId",
  verifyToken,
  isAdmin,
  deleteAchievement
);
router.post("/achievement", verifyToken, isAdmin, createAchievement);

//CRUD with student
router.get("/student/:studentId", verifyToken, isAdmin, getStudent);
router.put("/student/:studentId", verifyToken, isAdmin, updateStudent);
router.get("/student", verifyToken, isAdmin, getStudents);
router.get("/students", verifyToken, isAdmin, getAllStudent);
router.get("/student/:studentId", verifyToken, isAdmin, getStudent);
router.delete("/student/:studentId", verifyToken, isAdmin, deleteStudent);
router.post("/student", verifyToken, isAdmin, createStudent);

//Others
router.get("/cutRice", verifyToken, isAdmin, getAllCutRice);
router.get("/cutRiceByDate", verifyToken, isAdmin, getAllCutRiceByDate);
router.put("/cutRice/:studentId", verifyToken, isAdmin, updateStudentCutRice);
router.post(
  "/cutRice/auto-generate",
  verifyToken,
  isAdmin,
  generateAutoCutRiceForAllStudents
);
router.post(
  "/cutRice/:studentId/auto-generate",
  verifyToken,
  generateAutoCutRiceForStudent
);
router.get("/tuitionFees", verifyToken, isAdmin, getTuitionFees);
// Update tuition fee status (admin)
router.put(
  "/:studentId/tuitionFee/:tuitionFeeId/status",
  verifyToken,
  isAdmin,
  updateTuitionFeeStatus
);
router.post("/learningResults", verifyToken, isAdmin, getLearningResults);
router.get("/allStudentsGrades", verifyToken, isAdmin, getAllStudentsGrades);
router.get("/yearlyStatistics", verifyToken, isAdmin, getYearlyStatistics);
router.get("/partyRatings", verifyToken, isAdmin, getPartyRatings);
router.get("/trainingRatings", verifyToken, isAdmin, getTrainingRatings);
router.get(
  "/learningResultBySemester",
  verifyToken,
  isAdmin,
  getLearningResultBySemester
);
router.get(
  "/learningClassification",
  verifyToken,
  isAdmin,
  getLearningClassification
);
router.get(
  "/listSuggestedReward",
  verifyToken,
  isAdmin,
  getListSuggestedReward
);
router.get(
  "/topStudents/latestYear",
  verifyToken,
  isAdmin,
  getTopStudentsByLatestYear
);
router.get(
  "/topStudents/latestSemester",
  verifyToken,
  isAdmin,
  getTopStudentsByLatestSemester
);
router.get("/learningResultAll", verifyToken, isAdmin, getLearningResultAll);
router.get("/timeTables", verifyToken, isAdmin, getTimeTables);
router.get("/:studentId/timeTable", verifyToken, isAdmin, getTimeTable);
router.get("/cutRice/:cutRiceId", verifyToken, getCutRiceDetail);

// Routes cho cập nhật đồng loạt ngày ra trường
router.get("/graduatedStudents", verifyToken, isAdmin, getGraduatedStudents);
router.get("/allStudents", verifyToken, isAdmin, getAllStudents);
router.get("/enrollmentYears", verifyToken, isAdmin, getEnrollmentYears);
router.get("/schoolYears", verifyToken, isAdmin, getSchoolYears);
router.put(
  "/bulkUpdateGraduationDate",
  verifyToken,
  isAdmin,
  bulkUpdateGraduationDate
);

//CRUD with commander
router.delete("/:commanderId", verifyToken, isAdmin, deleteCommander);
router.get("/:userId", verifyToken, getCommander);
router.put("/:commanderId", verifyToken, updateCommander);
router.post("/", verifyToken, isAdmin, createCommander);
router.get("/", verifyToken, isAdmin, getCommanders);

module.exports = router;
