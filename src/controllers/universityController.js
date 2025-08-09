const University = require("../models/university");
const Organization = require("../models/organization");
const EducationLevel = require("../models/education_level");
const Class = require("../models/class");

const getUniversityHierarchy = async (req, res) => {
  try {
    const { universityId } = req.params;
    console.log("Getting hierarchy for universityId:", universityId);

    const university = await University.findById(universityId);
    if (!university) {
      console.log("University not found");
      return res.status(404).json({ message: "Không tìm thấy university" });
    }
    console.log("University found:", university.universityName);

    const organizations = await Organization.find({ universityId });
    console.log("Found organizations:", organizations.length);

    const result = {
      university: university,
      organizations: [],
    };

    for (const organization of organizations) {
      console.log("Processing organization:", organization.organizationName);
      const educationLevels = await EducationLevel.find({
        organizationId: organization._id,
      });
      console.log("Found education levels:", educationLevels.length);

      const orgWithLevels = {
        ...organization.toObject(),
        educationLevels: [],
      };

      for (const level of educationLevels) {
        console.log("Processing level:", level.levelName);
        const classes = await Class.find({ educationLevelId: level._id });
        console.log("Found classes:", classes.length);

        const levelWithClasses = {
          ...level.toObject(),
          classes: classes,
        };

        orgWithLevels.educationLevels.push(levelWithClasses);
      }

      result.organizations.push(orgWithLevels);
    }

    console.log("Final result:", JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getUniversityHierarchy:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getOrganizationsByUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;
    const organizations = await Organization.find({ universityId });
    return res.status(200).json(organizations);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getEducationLevelsByOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const educationLevels = await EducationLevel.find({ organizationId });
    return res.status(200).json(educationLevels);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getClassesByEducationLevel = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    const classes = await Class.find({ educationLevelId });
    return res.status(200).json(classes);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getAllUniversities = async (req, res) => {
  try {
    const universities = await University.find({ status: "active" });
    return res.status(200).json(universities);
  } catch (error) {
    console.error("Error getting universities:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getUniversityById = async (req, res) => {
  try {
    const { universityId } = req.params;
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "Không tìm thấy university" });
    }
    return res.status(200).json(university);
  } catch (error) {
    console.error("Error getting university by id:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy organization" });
    }
    return res.status(200).json(organization);
  } catch (error) {
    console.error("Error getting organization by id:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getEducationLevelById = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    const educationLevel = await EducationLevel.findById(educationLevelId);
    if (!educationLevel) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy education level" });
    }
    return res.status(200).json(educationLevel);
  } catch (error) {
    console.error("Error getting education level by id:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }
    return res.status(200).json(classData);
  } catch (error) {
    console.error("Error getting class by id:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createUniversity = async (req, res) => {
  try {
    const { universityCode, universityName, status } = req.body;

    console.log("Creating university:", req.body);

    // Kiểm tra university code đã tồn tại chưa
    const existingUniversity = await University.findOne({ universityCode });
    if (existingUniversity) {
      return res.status(400).json({ message: "Mã trường đã tồn tại" });
    }

    const university = new University({
      universityCode,
      universityName,
      status: status || "active",
    });

    await university.save();
    return res.status(201).json(university);
  } catch (error) {
    console.error("Error creating university:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;
    const { universityCode, universityName, status } = req.body;

    // Kiểm tra university có tồn tại không
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "Không tìm thấy trường đại học" });
    }

    // Kiểm tra university code mới có trùng với trường khác không
    if (universityCode !== university.universityCode) {
      const existingUniversity = await University.findOne({ universityCode });
      if (existingUniversity) {
        return res.status(400).json({ message: "Mã trường đã tồn tại" });
      }
    }

    const updatedUniversity = await University.findByIdAndUpdate(
      universityId,
      {
        universityCode,
        universityName,
        status: status || "active",
      },
      { new: true }
    );

    return res.status(200).json(updatedUniversity);
  } catch (error) {
    console.error("Error updating university:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteUniversity = async (req, res) => {
  try {
    const { universityId } = req.params;

    // Kiểm tra university có tồn tại không
    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "Không tìm thấy trường đại học" });
    }

    // Xóa tất cả organizations thuộc về university này
    await Organization.deleteMany({ universityId });

    // Xóa tất cả education levels thuộc về các organizations của university này
    const organizations = await Organization.find({ universityId });
    for (const organization of organizations) {
      await EducationLevel.deleteMany({ organizationId: organization._id });
    }

    // Xóa tất cả classes thuộc về các education levels của university này
    for (const organization of organizations) {
      const educationLevels = await EducationLevel.find({
        organizationId: organization._id,
      });
      for (const educationLevel of educationLevels) {
        await Class.deleteMany({ educationLevelId: educationLevel._id });
      }
    }

    // Cuối cùng xóa university
    await University.findByIdAndDelete(universityId);

    return res
      .status(200)
      .json({ message: "Trường đại học đã được xóa thành công" });
  } catch (error) {
    console.error("Error deleting university:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createOrganization = async (req, res) => {
  try {
    const { organizationName, travelTime } = req.body;
    const { universityId } = req.params;

    const university = await University.findById(universityId);
    if (!university) {
      return res.status(404).json({ message: "Không tìm thấy university" });
    }

    const organization = new Organization({
      organizationName,
      universityId,
      travelTime: travelTime || 45, // Mặc định 45 phút nếu không có
    });

    await organization.save();
    return res.status(201).json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createEducationLevel = async (req, res) => {
  try {
    const { levelName } = req.body;
    const { organizationId } = req.params;

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy organization" });
    }

    const educationLevel = new EducationLevel({
      levelName,
      organizationId,
    });

    await educationLevel.save();
    return res.status(201).json(educationLevel);
  } catch (error) {
    console.error("Error creating education level:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createClass = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    const { className } = req.body;

    if (!className) {
      return res.status(400).json({ message: "Tên lớp là bắt buộc" });
    }

    const newClass = new Class({
      className,
      educationLevelId,
      studentCount: 0, // Khởi tạo với 0 sinh viên
    });

    await newClass.save();

    return res.status(201).json(newClass);
  } catch (error) {
    console.error("Error creating class:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const organization = await Organization.findByIdAndUpdate(
      organizationId,
      req.body,
      { new: true }
    );

    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy organization" });
    }

    return res.status(200).json(organization);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateEducationLevel = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    const educationLevel = await EducationLevel.findByIdAndUpdate(
      educationLevelId,
      req.body,
      { new: true }
    );

    if (!educationLevel) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy education level" });
    }

    return res.status(200).json(educationLevel);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = await Class.findByIdAndUpdate(classId, req.body, {
      new: true,
    });

    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    return res.status(200).json(classItem);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const organization = await Organization.findByIdAndDelete(organizationId);

    if (!organization) {
      return res.status(404).json({ message: "Không tìm thấy organization" });
    }

    await EducationLevel.deleteMany({ organizationId });
    await Class.deleteMany({ organizationId });

    return res
      .status(200)
      .json({ message: "Organization đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteEducationLevel = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    const educationLevel = await EducationLevel.findByIdAndDelete(
      educationLevelId
    );

    if (!educationLevel) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy education level" });
    }

    await Class.deleteMany({ educationLevelId });

    return res
      .status(200)
      .json({ message: "Education level đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy lớp" });
    }

    // Kiểm tra xem có sinh viên trong lớp không
    if (classItem.studentCount > 0) {
      return res.status(400).json({
        message: `Không thể xóa lớp vì có ${classItem.studentCount} sinh viên đang học trong lớp này`,
      });
    }

    await Class.findByIdAndDelete(classId);

    return res.status(200).json({ message: "Xóa lớp thành công" });
  } catch (error) {
    console.error("Error deleting class:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getOrganizationHierarchy = async (req, res) => {
  try {
    const { organizationId } = req.params;
    console.log("Getting hierarchy for organizationId:", organizationId);

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      console.log("Organization not found");
      return res.status(404).json({ message: "Không tìm thấy organization" });
    }
    console.log("Organization found:", organization.organizationName);

    const educationLevels = await EducationLevel.find({ organizationId });
    console.log("Found education levels:", educationLevels.length);

    const result = {
      organization: organization,
      educationLevels: [],
    };

    for (const level of educationLevels) {
      console.log("Processing level:", level.levelName);
      const classes = await Class.find({ educationLevelId: level._id });
      console.log("Found classes:", classes.length);

      const levelWithClasses = {
        ...level.toObject(),
        classes: classes,
      };

      result.educationLevels.push(levelWithClasses);
    }

    console.log("Final result:", JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getOrganizationHierarchy:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getEducationLevelHierarchy = async (req, res) => {
  try {
    const { educationLevelId } = req.params;
    console.log("Getting hierarchy for educationLevelId:", educationLevelId);

    const educationLevel = await EducationLevel.findById(educationLevelId);
    if (!educationLevel) {
      console.log("Education level not found");
      return res
        .status(404)
        .json({ message: "Không tìm thấy education level" });
    }
    console.log("Education level found:", educationLevel.levelName);

    const classes = await Class.find({ educationLevelId });
    console.log("Found classes:", classes.length);

    const result = {
      educationLevel: educationLevel,
      classes: classes,
    };

    console.log("Final result:", JSON.stringify(result, null, 2));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in getEducationLevelHierarchy:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const syncAllClassesStudentCount = async (req, res) => {
  try {
    const classService = require("../services/classService");
    await classService.updateAllClassesStudentCount();

    return res.status(200).json({
      message: "Đồng bộ số lượng sinh viên cho tất cả lớp thành công",
    });
  } catch (error) {
    console.error("Error syncing all classes student count:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const syncClassStudentCount = async (req, res) => {
  try {
    const { classId } = req.params;
    const classService = require("../services/classService");
    const studentCount = await classService.updateClassStudentCount(classId);

    return res.status(200).json({
      message: "Đồng bộ số lượng sinh viên thành công",
      studentCount: studentCount,
    });
  } catch (error) {
    console.error("Error syncing class student count:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
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
  getOrganizationHierarchy,
  getEducationLevelHierarchy,
  syncAllClassesStudentCount,
  syncClassStudentCount,
};
