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

const createUniversity = async (req, res) => {
  try {
    const { universityCode, universityName, status } = req.body;

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
    const { className } = req.body;
    const { educationLevelId } = req.params;

    const educationLevel = await EducationLevel.findById(educationLevelId);
    if (!educationLevel) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy education level" });
    }

    const classItem = new Class({
      className,
      educationLevelId,
    });

    await classItem.save();
    return res.status(201).json(classItem);
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
    const classItem = await Class.findByIdAndDelete(classId);

    if (!classItem) {
      return res.status(404).json({ message: "Không tìm thấy class" });
    }

    return res.status(200).json({ message: "Class đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getAllUniversities,
  getUniversityHierarchy,
  getOrganizationsByUniversity,
  getEducationLevelsByOrganization,
  getClassesByEducationLevel,
  createUniversity,
  updateUniversity,
  createOrganization,
  createEducationLevel,
  createClass,
  updateOrganization,
  updateEducationLevel,
  updateClass,
  deleteOrganization,
  deleteEducationLevel,
  deleteClass,
};
