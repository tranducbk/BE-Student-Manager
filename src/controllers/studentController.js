const Student = require("../models/student");
const User = require("../models/user");
const universityController = require("./universityController");
const timeTableController = require("./timeTableController");

// Function để lấy danh sách tất cả students với populate đầy đủ
const getAllStudentsWithHierarchy = async (req, res) => {
  try {
    const students = await Student.find({}).populate([
      { path: "university", select: "universityCode universityName" },
      { path: "organization", select: "organizationName travelTime" },
      { path: "educationLevel", select: "levelName" },
      { path: "class", select: "className" },
    ]);

    return res.status(200).json(students);
  } catch (error) {
    console.error("Error getting students with hierarchy:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getStudent = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "student",
      populate: [
        { path: "university", select: "universityCode universityName" },
        { path: "organization", select: "organizationName travelTime" },
        { path: "educationLevel", select: "levelName" },
        { path: "class", select: "className" },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    res.status(200).json(student);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const updateStudent = async (req, res) => {
  try {
    const {
      studentId: newStudentId,
      fullName,
      gender,
      birthday,
      hometown,
      ethnicity,
      religion,
      currentAddress,
      placeOfBirth,
      phoneNumber,
      email,
      cccdNumber,
      partyMemberCardNumber,
      enrollment,
      graduationDate,
      class: classId,
      educationLevel,
      organization,
      university,
      unit,
      rank,
      positionGovernment,
      positionParty,
      fullPartyMember,
      probationaryPartyMember,
      dateOfEnlistment,
      avatar,
      familyMembers,
      foreignRelations,
    } = req.body;

    const updateData = {
      studentId: newStudentId,
      fullName,
      gender,
      birthday,
      hometown,
      ethnicity,
      religion,
      currentAddress,
      placeOfBirth,
      phoneNumber,
      email,
      cccdNumber,
      partyMemberCardNumber,
      enrollment,
      graduationDate,
      class: classId,
      educationLevel,
      organization,
      university,
      unit,
      rank,
      positionGovernment,
      positionParty,
      fullPartyMember,
      probationaryPartyMember,
      dateOfEnlistment,
      avatar,
    };

    // Thêm thông tin gia đình nếu có
    if (familyMembers && Array.isArray(familyMembers)) {
      updateData.familyMembers = familyMembers;
    }

    // Thêm thông tin yếu tố nước ngoài nếu có
    if (foreignRelations && Array.isArray(foreignRelations)) {
      updateData.foreignRelations = foreignRelations;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.studentId,
      updateData,
      { new: true }
    ).populate([
      { path: "university", select: "universityCode universityName" },
      { path: "organization", select: "organizationName travelTime" },
      { path: "educationLevel", select: "levelName" },
      { path: "class", select: "className" },
    ]);

    if (!updatedStudent)
      return res.status(404).json("Không tìm thấy sinh viên");

    return res.status(200).json(updatedStudent);
  } catch (error) {
    console.log("Cập nhật thất bại: ", error);
    return res.status(500).json("Lỗi server");
  }
};

const getTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;
    const { semester } = req.query;
    const list = student.tuitionFee || [];
    if (semester) {
      const filtered = list.filter(
        (t) => String(t.semester) === String(semester)
      );
      return res.status(200).json(filtered);
    }
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const addTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;
    const { totalAmount, semester, schoolYear, content, status } = req.body;

    const newTuitionFee = {
      totalAmount,
      semester,
      schoolYear,
      content,
      status,
    };

    student.tuitionFee.push(newTuitionFee);
    await student.save();

    return res.status(201).json(newTuitionFee);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getAchievement = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.achievement);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    // Tìm lịch cắt cơm auto-generated (ưu tiên) hoặc lịch thủ công
    const currentCutRice =
      student.cutRice.find((schedule) => schedule.isAutoGenerated === true) ||
      student.cutRice.find((schedule) => schedule.isAutoGenerated !== true);

    if (!currentCutRice) {
      // Trả về lịch rỗng nếu chưa có
      return res.status(200).json({
        monday: { breakfast: false, lunch: false, dinner: false },
        tuesday: { breakfast: false, lunch: false, dinner: false },
        wednesday: { breakfast: false, lunch: false, dinner: false },
        thursday: { breakfast: false, lunch: false, dinner: false },
        friday: { breakfast: false, lunch: false, dinner: false },
        saturday: { breakfast: false, lunch: false, dinner: false },
        sunday: { breakfast: false, lunch: false, dinner: false },
      });
    }

    return res.status(200).json(currentCutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    if (!student.cutRice) {
      student.cutRice = [];
    }

    // Tạo lịch cắt cơm thủ công
    const newCutRice = {
      ...req.body,
      isAutoGenerated: false,
      lastUpdated: new Date(),
      notes: "Lịch cắt cơm thủ công",
    };

    student.cutRice.push(newCutRice);
    await student.save();

    return res.status(201).json(newCutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo lịch cắt cơm tự động
const createAutoCutRice = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const autoCutRiceService = require("../services/autoCutRiceService");
    const cutRiceSchedule = await autoCutRiceService.updateAutoCutRice(
      user.student._id
    );

    return res.status(201).json({
      message: "Tạo lịch cắt cơm tự động thành công",
      schedule: cutRiceSchedule,
    });
  } catch (error) {
    console.error("Error creating auto cut rice:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật lịch cắt cơm tự động
const updateAutoCutRice = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const autoCutRiceService = require("../services/autoCutRiceService");
    const cutRiceSchedule = await autoCutRiceService.updateAutoCutRice(
      user.student._id
    );

    return res.status(200).json({
      message: "Cập nhật lịch cắt cơm tự động thành công",
      schedule: cutRiceSchedule,
    });
  } catch (error) {
    console.error("Error updating auto cut rice:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Reset về lịch cắt cơm tự động
const resetAutoCutRice = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const autoCutRiceService = require("../services/autoCutRiceService");
    const cutRiceSchedule = await autoCutRiceService.resetToAutoCutRice(
      user.student._id
    );

    return res.status(200).json({
      message: "Đã reset về lịch cắt cơm tự động",
      schedule: cutRiceSchedule,
    });
  } catch (error) {
    console.error("Error resetting auto cut rice:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật lịch cắt cơm thủ công (admin)
const updateManualCutRice = async (req, res) => {
  try {
    const { userId } = req.params;
    const { cutRiceData } = req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const student = user.student;

    // Lấy mảng đầu tiên để cập nhật
    let existingCutRice = null;

    if (student.cutRice.length > 0) {
      existingCutRice = student.cutRice[0];
    }

    if (existingCutRice) {
      // Cập nhật lịch thủ công
      existingCutRice.monday = cutRiceData.monday;
      existingCutRice.tuesday = cutRiceData.tuesday;
      existingCutRice.wednesday = cutRiceData.wednesday;
      existingCutRice.thursday = cutRiceData.thursday;
      existingCutRice.friday = cutRiceData.friday;
      existingCutRice.saturday = cutRiceData.saturday;
      existingCutRice.sunday = cutRiceData.sunday;
      existingCutRice.isAutoGenerated = false; // Đánh dấu là thủ công
      existingCutRice.lastUpdated = new Date();
      existingCutRice.notes = "Chỉnh sửa thủ công bởi admin";
    } else {
      // Tạo lịch mới
      const newCutRiceSchedule = {
        ...cutRiceData,
        isAutoGenerated: false,
        lastUpdated: new Date(),
        notes: "Tạo thủ công bởi admin",
      };
      student.cutRice.push(newCutRiceSchedule);
    }

    await student.save();

    return res.status(200).json({
      message: "Cập nhật lịch cắt cơm thủ công thành công",
      schedule: existingCutRice || student.cutRice[student.cutRice.length - 1],
    });
  } catch (error) {
    console.error("Error updating manual cut rice:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    // Tìm lịch cắt cơm hiện tại (không phải auto-generated)
    const currentCutRice = student.cutRice.find(
      (schedule) => schedule.isAutoGenerated !== true
    );

    if (currentCutRice) {
      // Cập nhật lịch hiện có
      Object.assign(currentCutRice, req.body);
      currentCutRice.lastUpdated = new Date();
    } else {
      // Tạo lịch mới
      const newCutRice = {
        ...req.body,
        isAutoGenerated: false,
        lastUpdated: new Date(),
        notes: "Lịch cắt cơm thủ công",
      };
      student.cutRice.push(newCutRice);
    }

    await student.save();

    // Trả về lịch đã cập nhật
    const updatedCutRice = student.cutRice.find(
      (schedule) => schedule.isAutoGenerated !== true
    );

    return res.status(200).json(updatedCutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const cutRice = student.cutRice.id(req.params.cutRiceId);
    if (!cutRice) {
      return res.status(404).json({ message: "cutRice không tồn tại" });
    }

    cutRice.deleteOne();
    await student.save();

    return res.status(200).json(student.cutRice);
  } catch (error) {
    console.error("Error deleting cutRice:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getLearningInformation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const addLearningInformation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    student.learningInformation.push(req.body);
    await student.save();

    return res.status(201).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const deleteTuitionFee = async (req, res) => {
  try {
    const { userId, feeId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    student.tuitionFee = student.tuitionFee.filter(
      (fee) => fee._id.toString() !== feeId
    );

    await student.save();

    return res
      .status(200)
      .json({ message: "Tuition fee đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteLearningInformation = async (req, res) => {
  try {
    const { userId, learnId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tìm và xóa trong semesterResults thay vì learningInformation
    const semesterIndex = student.semesterResults.findIndex(
      (result) => result._id.toString() === learnId
    );

    if (semesterIndex === -1) {
      return res.status(404).json({
        message: "Không tìm thấy kết quả học tập",
      });
    }

    student.semesterResults.splice(semesterIndex, 1);

    // Cập nhật điểm tích lũy cho tất cả học kỳ còn lại
    if (student.semesterResults.length > 0) {
      const gradeHelper = require("../helpers/gradeHelper");
      gradeHelper.updateCumulativeGrades(student.semesterResults);
    }

    await student.save();

    return res
      .status(200)
      .json({ message: "Learning Information đã được xóa thành công" });
  } catch (error) {
    console.error("Error deleting learning information:", error);
    return res.status(500).json("Lỗi server");
  }
};

const updateTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const tuitionFee = student.tuitionFee.id(req.params.tuitionFeeId);
    if (!tuitionFee) {
      return res.status(404).json({ message: "tuitionFee không tồn tại" });
    }

    tuitionFee.set(req.body);
    await student.save();

    return res.status(200).json(student.tuitionFee);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateLearningResult = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const learningResult = student.learningInformation.id(req.params.learnId);
    if (!learningResult) {
      return res.status(404).json({ message: "learningResult không tồn tại" });
    }

    learningResult.set(req.body);
    await student.save();

    return res.status(200).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Debug function để kiểm tra lịch cắt cơm
const debugCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Lấy thông tin timeTable từ model mới
    const TimeTable = require("../models/time_table");
    const timeTable = await TimeTable.findOne({ studentId: student._id });
    const scheduleCount = timeTable ? timeTable.schedules.length : 0;

    return res.status(200).json({
      studentId: student._id,
      fullName: student.fullName,
      cutRiceCount: student.cutRice.length,
      cutRice: student.cutRice,
      timeTableCount: scheduleCount,
      timeTable: timeTable,
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// ===== CRUD CHO THÔNG TIN NGƯỜI THÂN =====

// Thêm thông tin người thân
const addFamilyMember = async (req, res) => {
  try {
    const { studentId } = req.params;
    const familyMemberData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    student.familyMembers.push(familyMemberData);
    await student.save();

    res.status(201).json({
      message: "Thêm thông tin người thân thành công",
      familyMember: familyMemberData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách thông tin người thân
const getFamilyMembers = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    res.status(200).json({
      familyMembers: student.familyMembers,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật thông tin người thân
const updateFamilyMember = async (req, res) => {
  try {
    const { studentId, familyMemberId } = req.params;
    const updateData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const familyMember = student.familyMembers.id(familyMemberId);
    if (!familyMember) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người thân" });
    }

    Object.assign(familyMember, updateData);
    await student.save();

    res.status(200).json({
      message: "Cập nhật thông tin người thân thành công",
      familyMember,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa thông tin người thân
const deleteFamilyMember = async (req, res) => {
  try {
    const { studentId, familyMemberId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const familyMember = student.familyMembers.id(familyMemberId);
    if (!familyMember) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người thân" });
    }

    familyMember.remove();
    await student.save();

    res.status(200).json({
      message: "Xóa thông tin người thân thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== CRUD CHO MỐI QUAN HỆ NƯỚC NGOÀI =====

// Thêm mối quan hệ nước ngoài
const addForeignRelation = async (req, res) => {
  try {
    const { studentId } = req.params;
    const foreignRelationData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    student.foreignRelations.push(foreignRelationData);
    await student.save();

    res.status(201).json({
      message: "Thêm mối quan hệ nước ngoài thành công",
      foreignRelation: foreignRelationData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách mối quan hệ nước ngoài
const getForeignRelations = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    res.status(200).json({
      foreignRelations: student.foreignRelations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật mối quan hệ nước ngoài
const updateForeignRelation = async (req, res) => {
  try {
    const { studentId, foreignRelationId } = req.params;
    const updateData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const foreignRelation = student.foreignRelations.id(foreignRelationId);
    if (!foreignRelation) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy mối quan hệ nước ngoài" });
    }

    Object.assign(foreignRelation, updateData);
    await student.save();

    res.status(200).json({
      message: "Cập nhật mối quan hệ nước ngoài thành công",
      foreignRelation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa mối quan hệ nước ngoài
const deleteForeignRelation = async (req, res) => {
  try {
    const { studentId, foreignRelationId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const foreignRelation = student.foreignRelations.id(foreignRelationId);
    if (!foreignRelation) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy mối quan hệ nước ngoài" });
    }

    foreignRelation.remove();
    await student.save();

    res.status(200).json({
      message: "Xóa mối quan hệ nước ngoài thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== CRUD CHO XẾP LOẠI Đảng viên =====

// Thêm xếp loại Đảng viên
const addPartyRating = async (req, res) => {
  try {
    const { studentId } = req.params;
    const partyRatingData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    student.partyRatings.push(partyRatingData);
    await student.save();

    res.status(201).json({
      message: "Thêm xếp loại Đảng viên thành công",
      partyRating: partyRatingData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách xếp loại Đảng viên
const getPartyRatings = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    res.status(200).json({
      partyRatings: student.partyRatings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật xếp loại Đảng viên
const updatePartyRating = async (req, res) => {
  try {
    const { studentId, partyRatingId } = req.params;
    const updateData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const partyRating = student.partyRatings.id(partyRatingId);
    if (!partyRating) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy xếp loại Đảng viên" });
    }

    Object.assign(partyRating, updateData);
    await student.save();

    res.status(200).json({
      message: "Cập nhật xếp loại Đảng viên thành công",
      partyRating,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa xếp loại Đảng viên
const deletePartyRating = async (req, res) => {
  try {
    const { studentId, partyRatingId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const partyRating = student.partyRatings.id(partyRatingId);
    if (!partyRating) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy xếp loại Đảng viên" });
    }

    partyRating.remove();
    await student.save();

    res.status(200).json({
      message: "Xóa xếp loại Đảng viên thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===== CRUD CHO XẾP LOẠI RÈN LUYỆN =====

// Thêm xếp loại rèn luyện
const addTrainingRating = async (req, res) => {
  try {
    const { studentId } = req.params;
    const trainingRatingData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    student.trainingRatings.push(trainingRatingData);
    await student.save();

    res.status(201).json({
      message: "Thêm xếp loại rèn luyện thành công",
      trainingRating: trainingRatingData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách xếp loại rèn luyện
const getTrainingRatings = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    res.status(200).json({
      trainingRatings: student.trainingRatings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật xếp loại rèn luyện
const updateTrainingRating = async (req, res) => {
  try {
    const { studentId, trainingRatingId } = req.params;
    const updateData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const trainingRating = student.trainingRatings.id(trainingRatingId);
    if (!trainingRating) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy xếp loại rèn luyện" });
    }

    Object.assign(trainingRating, updateData);
    await student.save();

    res.status(200).json({
      message: "Cập nhật xếp loại rèn luyện thành công",
      trainingRating,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa xếp loại rèn luyện
const deleteTrainingRating = async (req, res) => {
  try {
    const { studentId, trainingRatingId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const trainingRating = student.trainingRatings.id(trainingRatingId);
    if (!trainingRating) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy xếp loại rèn luyện" });
    }

    trainingRating.remove();
    await student.save();

    res.status(200).json({
      message: "Xóa xếp loại rèn luyện thành công",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllStudentsWithHierarchy,
  updateStudent,
  getStudent,
  addTuitionFee,
  getAchievement,
  getCutRice,
  createCutRice,
  createAutoCutRice,
  updateAutoCutRice,
  resetAutoCutRice,
  updateManualCutRice,
  updateCutRice,
  deleteCutRice,
  getTuitionFee,
  getLearningInformation,
  addLearningInformation,
  deleteTuitionFee,
  deleteLearningInformation,
  updateTuitionFee,
  updateLearningResult,
  debugCutRice, // Thêm function debug
  addFamilyMember,
  getFamilyMembers,
  updateFamilyMember,
  deleteFamilyMember,
  addForeignRelation,
  getForeignRelations,
  updateForeignRelation,
  deleteForeignRelation,
  addPartyRating,
  getPartyRatings,
  updatePartyRating,
  deletePartyRating,
  addTrainingRating,
  getTrainingRatings,
  updateTrainingRating,
  deleteTrainingRating,
  ...universityController,
  ...timeTableController,
};
