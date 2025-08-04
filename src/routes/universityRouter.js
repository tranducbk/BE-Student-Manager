const router = require("express").Router();
const { verifyToken } = require("../middlewares/verify");
const {
  getAllUniversities,
  getUniversityHierarchy,
  getOrganizationsByUniversity,
  getEducationLevelsByOrganization,
  getClassesByEducationLevel,
  getUniversityById,
  getOrganizationById,
  getEducationLevelById,
  getClassById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
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

// University routes
router.get("/", verifyToken, getAllUniversities);
router.get("/:universityId/hierarchy", verifyToken, getUniversityHierarchy);
router.get("/:universityId", verifyToken, getUniversityById);
router.post("/create", verifyToken, createUniversity);
router.put("/:universityId", verifyToken, updateUniversity);
router.delete("/:universityId", verifyToken, deleteUniversity);

// Organization routes
router.get(
  "/:universityId/organizations",
  verifyToken,
  getOrganizationsByUniversity
);
router.get("/organizations/:organizationId", verifyToken, getOrganizationById);
router.post("/:universityId/organizations", verifyToken, createOrganization);
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
router.get(
  "/education-levels/:educationLevelId",
  verifyToken,
  getEducationLevelById
);
router.post(
  "/organizations/:organizationId/education-levels",
  verifyToken,
  createEducationLevel
);
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
router.get("/classes/:classId", verifyToken, getClassById);
router.post(
  "/education-levels/:educationLevelId/classes",
  verifyToken,
  createClass
);
router.put("/classes/:classId", verifyToken, updateClass);
router.delete("/classes/:classId", verifyToken, deleteClass);

module.exports = router;
