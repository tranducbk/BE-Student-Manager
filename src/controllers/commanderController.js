const bcrypt = require("bcrypt");
const moment = require("moment");
const path = require("path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  WidthType,
  TabStopPosition,
  Table,
  TableCell,
  TableRow,
  HeightRule,
  VerticalAlign,
} = require("docx");
const Commander = require("../models/commander");
const Student = require("../models/student");
const User = require("../models/user");
const VacationSchedule = require("../models/vacation_schedule");
const Violation = require("../models/violation");
const RegulatoryDocument = require("../models/regulatory_document");
const StudentNotifications = require("../models/student_notifications");

const limit = 10;

const getCommander = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("commander");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const commander = user.commander;

    res.status(200).json(commander);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;
  const { fullName, unit } = req.query;
  let query = {};

  if (fullName) {
    query.fullName = fullName;
  }

  if (unit) {
    query.unit = unit;
  }

  try {
    let students = await Student.find(query)
      .populate([
        { path: "university", select: "universityCode universityName" },
        { path: "organization", select: "organizationName travelTime" },
        { path: "educationLevel", select: "levelName" },
        { path: "class", select: "className" },
      ])
      .skip(skip)
      .limit(limit);

    if (students.length === 0) {
      return res.json([]);
    }

    const totalCount = await Student.countDocuments(query);

    // Tính toán tổng số trang
    const totalPages = Math.ceil(totalCount / limit);

    // Trả về dữ liệu của trang hiện tại cùng với thông tin về tổng số trang
    return res.status(200).json({ students, totalPages });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getAllStudent = async (req, res) => {
  try {
    const students = await Student.find();

    if (!students || students.length === 0) {
      return res.status(404).json("Không tìm thấy student");
    }

    return res.status(200).json(students);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getCommanders = async (req, res) => {
  try {
    const commander = await Commander.find();

    if (!commander)
      return res.status(404).json({ message: "Không tìm thấy commander" });

    return res.status(200).json(commander);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const updateCommander = async (req, res) => {
  try {
    const updatedCommander = await Commander.findByIdAndUpdate(
      req.params.commanderId,
      req.body,
      { new: true }
    );

    if (!updatedCommander)
      return res.status(404).json({ message: "Không tìm thấy chỉ huy" });

    return res.status(200).json(updatedCommander);
  } catch (error) {
    console.error("Lỗi khi cập nhật sinh viên:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    if (!student)
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });

    // Lưu thông tin lớp trước khi xóa
    const classId = student.class;

    // Xóa user liên quan
    const user = await User.findOne({ student: req.params.studentId });
    if (user) {
      await User.findByIdAndDelete(user._id);
    }

    // Xóa sinh viên
    await Student.findByIdAndDelete(req.params.studentId);

    // Cập nhật số lượng sinh viên trong lớp
    if (classId) {
      const classService = require("../services/classService");
      await classService.removeStudentFromClass(classId);
    }

    return res.status(200).json({ message: "Xóa sinh viên thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa sinh viên:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteCommander = async (req, res) => {
  try {
    const commander = await Commander.findById(req.params.commanderId);

    if (!commander)
      return res.status(404).json({ message: "Không tìm thấy chỉ huy" });

    await commander.deleteOne();

    await User.findOneAndDelete({ commander: req.params.commanderId });

    res.status(200).json({ message: "Xóa chỉ huy thành công" });
  } catch (error) {
    res.status(500).json(error);
  }
};

const createCommander = async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser)
      return res.status(400).json({ message: "Người dùng đã tồn tại" });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newCommander = new Commander();
    await newCommander.save();

    const newUser = new User({
      username: req.body.username,
      password: hashedPassword,
      isAdmin: true,
      commander: newCommander._id,
    });

    await newUser.save();

    const {
      commanderId,
      fullName,
      gender,
      birthday,
      hometown,
      email,
      phoneNumber,
      startWork,
      organization,
      unit,
      rank,
      positionGovernment,
      positionParty,
      fullPartyMember,
      probationaryPartyMember,
      dateOfEnlistment,
      avatar,
    } = req.body;

    const updatedCommander = await Commander.findByIdAndUpdate(
      newUser.commander,
      {
        commanderId,
        fullName,
        gender,
        birthday,
        hometown,
        email,
        phoneNumber,
        startWork,
        organization,
        unit,
        rank,
        positionGovernment,
        positionParty,
        fullPartyMember,
        probationaryPartyMember,
        dateOfEnlistment,
        avatar,
      },
      { new: true }
    );

    if (!updatedCommander)
      return res.status(404).json({ message: "Không tìm thấy chỉ huy" });

    return res.status(200).json("Tạo commander thành công");
  } catch (error) {
    console.log("Đăng ký thất bại: ", error);
    return res.status(500).json({ message: "Đăng ký thất bại" });
  }
};

const createStudent = async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser)
      return res.status(400).json({ message: "Người dùng đã tồn tại" });

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newStudent = new Student();
    await newStudent.save();

    const newUser = new User({
      username: req.body.username,
      password: hashedPassword,
      isAdmin: false,
      student: newStudent._id,
    });

    await newUser.save();

    const {
      studentId,
      fullName,
      gender,
      birthday,
      hometown,
      currentAddress,
      email,
      phoneNumber,
      enrollment,
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
      studentId,
      fullName: fullName ? fullName : req.body.username,
      gender,
      birthday,
      hometown,
      currentAddress,
      email,
      phoneNumber,
      enrollment,
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
      newUser.student,
      updateData,
      { new: true }
    ).populate([
      { path: "university", select: "universityCode universityName" },
      { path: "organization", select: "organizationName travelTime" },
      { path: "educationLevel", select: "levelName" },
      { path: "class", select: "className" },
    ]);

    // Cập nhật số lượng sinh viên trong lớp
    if (classId) {
      const classService = require("../services/classService");
      await classService.addStudentToClass(classId);
    }

    return res.status(201).json({
      message: "Tạo sinh viên thành công",
      student: updatedStudent,
    });
  } catch (error) {
    console.log("Đăng ký thất bại: ", error);
    return res.status(500).json({ message: "Đăng ký thất bại" });
  }
};

const getAchievements = async (req, res) => {
  try {
    const schoolYear = req.query.year;
    const semester = req.query.semester;

    const students = await Student.find();

    let allAchievements = [];

    students.forEach((student) => {
      student.achievement.forEach((achievement) => {
        allAchievements.push({
          _id: achievement._id,
          studentId: student._id,
          semester: achievement.semester,
          schoolYear: achievement.schoolYear,
          content: achievement.content,
          fullName: student.fullName,
          unit: student.unit,
        });
      });
    });

    // Lọc dữ liệu dựa trên schoolYear và semester nếu cung cấp
    if (schoolYear && semester) {
      allAchievements = allAchievements.filter((achievement) => {
        return (
          achievement.schoolYear === schoolYear &&
          achievement.semester === semester
        );
      });
    } else if (schoolYear) {
      allAchievements = allAchievements.filter((achievement) => {
        return achievement.schoolYear === schoolYear;
      });
    } else if (semester) {
      allAchievements = allAchievements.filter((achievement) => {
        return achievement.semester === semester;
      });
    }

    allAchievements.sort((a, b) => {
      // Chuyển đổi HK1, HK2, HK3 thành số để so sánh
      const semesterA = a.semester.replace("HK", "");
      const semesterB = b.semester.replace("HK", "");
      const yearA = parseInt(a.schoolYear.split(" ")[2]);
      const yearB = parseInt(b.schoolYear.split(" ")[2]);

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      return parseInt(semesterB) - parseInt(semesterA);
    });

    return res.status(200).json(allAchievements);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateAchievement = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    const achievement = student.achievement.id(req.params.achievementId);

    if (!achievement) {
      return res.status(404).json({ message: "Achievement không tồn tại" });
    }

    achievement.set(req.body);
    await student.save();

    return res.status(200).json(student.achievement);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createAchievement = async (req, res) => {
  try {
    const { fullName, ...achievement } = req.body;

    const student = await Student.findOne({ fullName: fullName });

    if (!student) {
      return res.status(404).json("Không tìm thấy sinh viên");
    }

    student.achievement.push(achievement);
    await student.save();

    return res.status(201).json(student.achievement);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteAchievement = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const achievement = student.achievement.id(req.params.achievementId);
    if (!achievement) {
      return res.status(404).json({ message: "Achievement không tồn tại" });
    }

    achievement.deleteOne();
    await student.save();

    return res.status(200).json(student.achievement);
  } catch (error) {
    console.error("Error deleting achievement:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getHelpCooking = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const allHelpCookings = student.helpCooking;

    return res.status(200).json(allHelpCookings);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateHelpCooking = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const helpCooking = student.helpCooking.id(req.params.helpCookingId);
    if (!helpCooking) {
      return res.status(404).json({ message: "HelpCooking không tồn tại" });
    }

    helpCooking.set(req.body);
    await student.save();

    return res.status(200).json(student.helpCooking);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteHelpCooking = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const helpCooking = student.helpCooking.id(req.params.helpCookingId);
    if (!helpCooking) {
      return res.status(404).json({ message: "HelpCooking không tồn tại" });
    }

    helpCooking.deleteOne();
    await student.save();

    return res.status(200).json(student.helpCooking);
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

const createHelpCooking = async (req, res) => {
  try {
    const { fullName, ...helpCooking } = req.body;

    const student = await Student.findOne({ fullName: fullName });

    if (!student) {
      return res.status(404).json("Không tìm thấy sinh viên");
    }

    student.helpCooking.push(helpCooking);
    await student.save();

    return res.status(201).json(student.helpCooking);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getPhysicalResult = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.physicalResult);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updatePhysicalResult = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    const physicalResult = student.physicalResult.id(
      req.params.physicalResultId
    );

    if (!physicalResult) {
      return res.status(404).json({ message: "PhysicalResult không tồn tại" });
    }

    physicalResult.set(req.body);
    await student.save();

    return res.status(200).json(student.physicalResult);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deletePhysicalResult = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);

    const physicalResult = student.physicalResult.id(
      req.params.physicalResultId
    );
    if (!physicalResult) {
      return res.status(404).json({ message: "PhysicalResul không tồn tại" });
    }

    await physicalResult.deleteOne();
    await student.save();

    return res.status(200).json(student.physicalResult);
  } catch (error) {
    return res.status(500).json({ message: "Server Error" });
  }
};

const createPhysicalResult = async (req, res) => {
  try {
    const { fullName, ...physicalResult } = req.body;

    const student = await Student.findOne({ fullName: fullName });

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    student.physicalResult.push(physicalResult);
    await student.save();

    return res.status(201).json(student.physicalResult);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createVacationSchedule = async (req, res) => {
  try {
    const { fullName, ...vacationScheduleData } = req.body;

    const student = await Student.findOne({ fullName: fullName });

    if (!student) {
      return res.status(404).json("Không tìm thấy học viên");
    }

    const vacationSchedule = await VacationSchedule.create(
      vacationScheduleData
    );
    await student.vacationSchedule.push(vacationSchedule._id);
    await student.save();

    return res.status(201).json(vacationSchedule);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getVacationSchedule = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "student",
      populate: {
        path: "vacationSchedule",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const vacationSchedules = student.vacationSchedule;
    return res.json(vacationSchedules);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getVacationScheduleByDate = async (req, res) => {
  try {
    const currentDate = new Date();

    const todaySchedule = await VacationSchedule.find({
      dayoff: { $eq: currentDate.toISOString().split("T")[0] },
    });

    return res.status(200).json(todaySchedule.length);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getVacationSchedules = async (req, res) => {
  try {
    const unitQuery = req.query.unit;

    const students = await Student.find({}).populate("vacationSchedule");
    let results = [];

    students.forEach((student) => {
      student.vacationSchedule.forEach((schedule) => {
        const data = {
          _id: schedule._id,
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          rank: student.rank,
          reason: schedule.reason,
          address: schedule.address,
          time: schedule.time,
          dayoff: schedule.dayoff,
        };
        results.push(data);
      });
    });

    if (unitQuery) {
      results = results.filter((item) => {
        return item.unit === unitQuery;
      });
    }

    results.sort((a, b) => new Date(b.dayoff) - new Date(a.dayoff));

    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const getViolation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "student",
      populate: {
        path: "violation",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const violations = student.violation;
    return res.json(violations);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getViolations = async (req, res) => {
  try {
    const { fullName, unit } = req.query;

    const students = await Student.find({}).populate("violation");
    let violations = [];

    students.forEach((student) => {
      student.violation.forEach((violation) => {
        const data = {
          _id: violation._id,
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          content: violation.content,
          dateOfViolation: violation.dateOfViolation,
          penalty: violation.penalty,
        };
        violations.push(data);
      });
    });

    if (fullName && unit) {
      violations = violations.filter((violation) => {
        return violation.unit === unit && violation.fullName === fullName;
      });
    } else if (unit) {
      violations = violations.filter((violation) => {
        return violation.unit === unit;
      });
    } else if (fullName) {
      violations = violations.filter((violation) => {
        return violation.fullName === fullName;
      });
    }

    violations.sort(
      (a, b) => new Date(b.dateOfViolation) - new Date(a.dateOfViolation)
    );

    return res.json(violations);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const createViolation = async (req, res) => {
  try {
    const { fullName, ...violationData } = req.body;

    const student = await Student.findOne({ fullName: fullName });

    if (!student) {
      return res.status(404).json("Không tìm thấy sinh viên");
    }

    const violation = await Violation.create(violationData);
    student.violation.push(violation._id);
    await student.save();

    return res.status(201).json(violation);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getAllCutRiceByDate = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][currentDay];

    const students = await Student.find();

    const cutRiceData = getCutRiceData(students, dayOfWeek);

    const { breakfast, lunch, dinner } = countMeals(cutRiceData);

    return res.status(200).json({ breakfast, lunch, dinner, dayOfWeek });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getCutRiceData = (students, dayOfWeek) => {
  return students
    .map((student) => student.cutRice.map((cutRice) => cutRice[dayOfWeek]))
    .filter((cutRiceOfDay) => cutRiceOfDay && cutRiceOfDay.length > 0);
};

const countMeals = (cutRiceData) => {
  let breakfast = 0,
    lunch = 0,
    dinner = 0;
  cutRiceData.forEach((item) => {
    if (item.length > 0) {
      if (item[0].breakfast) breakfast++;
      if (item[0].lunch) lunch++;
      if (item[0].dinner) dinner++;
    }
  });
  return { breakfast, lunch, dinner };
};

const getAllCutRice = async (req, res) => {
  try {
    const unitQuery = req.query.unit;

    const students = await Student.find(unitQuery ? { unit: unitQuery } : {});

    const cutRices = [];

    students.forEach((student) => {
      student.cutRice.forEach((cutRice) => {
        cutRices.push({
          _id: cutRice._id,
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          isAutoGenerated: cutRice.isAutoGenerated,
          monday: cutRice.monday,
          tuesday: cutRice.tuesday,
          wednesday: cutRice.wednesday,
          thursday: cutRice.thursday,
          friday: cutRice.friday,
          saturday: cutRice.saturday,
          sunday: cutRice.sunday,
        });
      });
    });

    return res.status(200).json(cutRices);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getTuitionFees = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;

    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
    ]);

    let tuitionFees = [];

    students.forEach((student) => {
      student.tuitionFee.forEach((tuitionFee) => {
        tuitionFees.push({
          _id: tuitionFee._id,
          studentId: student._id,
          fullName: student.fullName,
          university:
            (student.university && student.university.universityName) || "",
          unit: student.unit,
          className: (student.class && student.class.className) || "",
          totalAmount: tuitionFee.totalAmount,
          semester: tuitionFee.semester,
          content: tuitionFee.content,
          status: tuitionFee.status,
        });
      });
    });

    if (semesterQuery) {
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return tuitionFee.semester === semesterQuery;
      });
    }

    const totalAmountSum = tuitionFees.reduce((sum, tuitionFee) => {
      return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
    }, 0);

    return res.status(200).json({ tuitionFees, totalAmountSum });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getLearningResultAll = async (req, res) => {
  try {
    const students = await Student.find();

    let learningResults = 0,
      studentOweSubjects = 0;

    let allSemesters = [];
    students.forEach((student) => {
      student.learningInformation.forEach((info) => {
        allSemesters.push(info.semester);
      });
    });

    // Lọc ra học kỳ lớn nhất từ mảng
    const maxSemester = allSemesters.reduce((max, current) => {
      // Chuyển đổi HK1, HK2, HK3 thành số để so sánh
      const maxNum = parseInt(max.replace("HK", ""));
      const currentNum = parseInt(current.replace("HK", ""));
      return maxNum > currentNum ? max : current;
    });

    if (!maxSemester) {
      return res.status(404).json({ message: "Không tìm thấy học kỳ nào." });
    }

    students.forEach((student) => {
      student.learningInformation.forEach((learningInformation) => {
        if (learningInformation.semester === maxSemester) {
          if (learningInformation.CPA >= 2.5) learningResults++;
          if (learningInformation.totalDebt) studentOweSubjects++;
        }
      });
    });

    return res.status(200).json({ learningResults, studentOweSubjects });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getLearningResults = async (req, res) => {
  try {
    const { semesterData } = req.body;
    console.log("Semester data received:", semesterData);

    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    console.log("Total students found:", students.length);

    let learningResults = [];

    students.forEach((student) => {
      console.log(
        `Student ${student.fullName} has ${student.learningInformation.length} learning records`
      );
      student.learningInformation.forEach((learningInformation) => {
        console.log(
          `Learning record semester: ${learningInformation.semester}, schoolYear: ${learningInformation.schoolYear}`
        );
        learningResults.push({
          _id: learningInformation._id,
          studentId: student._id,
          fullName: student.fullName,
          studentId: student.studentId,
          university: student.university
            ? student.university.universityName
            : "",
          className: student.class ? student.class.className : "",
          semester: learningInformation.semester,
          schoolYear: learningInformation.schoolYear,
          CPA: learningInformation.CPA,
          GPA: learningInformation.GPA,
          cumulativeCredit: learningInformation.cumulativeCredit,
          studentLevel: learningInformation.studentLevel,
          warningLevel: learningInformation.warningLevel,
          totalDebt: learningInformation.totalDebt,
          learningStatus: learningInformation.learningStatus,
        });
      });
    });

    console.log(
      "Total learning results before filter:",
      learningResults.length
    );

    if (semesterData && semesterData.length > 0) {
      // Lọc theo semester và schoolYear
      console.log("Filtering by semester data:", semesterData);

      learningResults = learningResults.filter((learningResult) => {
        const matches = semesterData.some((filterItem) => {
          const semesterMatch = filterItem.semester === learningResult.semester;
          const schoolYearMatch =
            filterItem.schoolYear === learningResult.schoolYear;
          const result = semesterMatch && schoolYearMatch;
          console.log(
            `Checking: ${learningResult.semester}-${learningResult.schoolYear} vs ${filterItem.semester}-${filterItem.schoolYear} = ${result}`
          );
          return result;
        });
        return matches;
      });
    }

    console.log("Final learning results count:", learningResults.length);
    return res.status(200).json(learningResults);
  } catch (error) {
    console.error("Error in getLearningResults:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getPhysicalResults = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;
    const unitQuery = req.query.unit;

    const students = await Student.find();

    let physicalResults = [];

    students.forEach((student) => {
      student.physicalResult.forEach((physicalResult) => {
        physicalResults.push({
          _id: physicalResult._id,
          fullName: student.fullName,
          unit: student.unit,
          studentId: student._id,
          semester: physicalResult.semester,
          run3000m: physicalResult.run3000m,
          run100m: physicalResult.run100m,
          pullUpBar: physicalResult.pullUpBar,
          swimming100m: physicalResult.swimming100m,
          practise: physicalResult.practise,
        });
      });
    });

    if (unitQuery && semesterQuery) {
      physicalResults = physicalResults.filter((achievement) => {
        return (
          achievement.unit === unitQuery &&
          achievement.semester === semesterQuery
        );
      });
    } else if (unitQuery) {
      physicalResults = physicalResults.filter((achievement) => {
        return achievement.unit === unitQuery;
      });
    } else if (semesterQuery) {
      physicalResults = physicalResults.filter((achievement) => {
        return achievement.semester === semesterQuery;
      });
    }

    physicalResults.sort((a, b) => {
      const [yearA, semesterA] = a.semester.split(".");
      const [yearB, semesterB] = b.semester.split(".");

      // So sánh năm trước
      if (yearA !== yearB) {
        return yearB - yearA;
      }

      // Nếu cùng năm, so sánh theo học kỳ
      return semesterB - semesterA;
    });

    return res.status(200).json(physicalResults);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getRegulatoryDocuments = async (req, res) => {
  try {
    const documents = await RegulatoryDocument.find({}).sort({
      dateIssued: -1,
    });
    return res.status(200).send(documents);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getRegulatoryDocument = async (req, res) => {
  try {
    const document = await RegulatoryDocument.findById(
      req.params.regulatoryDocumentId
    );
    return res.status(200).json(document);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getTimeTables = async (req, res) => {
  try {
    const { fullName, unit } = req.query;

    // Lấy tất cả timeTable từ model time_table
    const TimeTable = require("../models/time_table");
    let timeTables = await TimeTable.find({}).populate("studentId");

    let results = [];

    // Chuyển đổi dữ liệu
    timeTables.forEach((timeTable) => {
      if (
        timeTable.studentId &&
        timeTable.schedules &&
        timeTable.schedules.length > 0
      ) {
        timeTable.schedules.forEach((schedule) => {
          const data = {
            _id: schedule._id || Math.random().toString(36).substr(2, 9),
            studentId: timeTable.studentId._id,
            fullName: timeTable.studentId.fullName,
            unit: timeTable.studentId.unit,
            day: schedule.day,
            schoolWeek: schedule.schoolWeek,
            time: schedule.time,
            subject: schedule.subject,
            classroom: schedule.classroom,
          };
          results.push(data);
        });
      }
    });

    // Lọc theo tên và đơn vị nếu có
    if (fullName && unit) {
      results = results.filter((item) => {
        return (
          item.unit === unit &&
          item.fullName.toLowerCase().includes(fullName.toLowerCase())
        );
      });
    } else if (unit) {
      results = results.filter((item) => {
        return item.unit === unit;
      });
    } else if (fullName) {
      results = results.filter((item) => {
        return item.fullName.toLowerCase().includes(fullName.toLowerCase());
      });
    }

    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const deleteViolation = async (req, res) => {
  try {
    const { studentId, violationId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student không tồn tại" });
    }

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return res.status(404).json({ message: "Violation không tồn tại" });
    }

    const index = student.violation.indexOf(violationId);
    if (index > -1) {
      student.violation.splice(index, 1);
    }

    await student.save();

    return res
      .status(200)
      .json({ message: "Violation đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteVacationSchedule = async (req, res) => {
  try {
    const { studentId, vacationScheduleId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student không tồn tại" });
    }

    const vacationSchedule = await VacationSchedule.findById(
      vacationScheduleId
    );
    if (!vacationSchedule) {
      return res
        .status(404)
        .json({ message: "vacationSchedule không tồn tại" });
    }

    const index = student.vacationSchedule.indexOf(vacationScheduleId);
    if (index > -1) {
      student.vacationSchedule.splice(index, 1);
    }

    await student.save();

    return res
      .status(200)
      .json({ message: "vacationSchedule đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const updateVacationSchedule = async (req, res) => {
  try {
    const updatedVacationSchedule = await VacationSchedule.findByIdAndUpdate(
      req.params.vacationScheduleId,
      req.body
    );

    if (!updatedVacationSchedule) {
      return res
        .status(404)
        .json({ message: "vacationSchedule không tồn tại" });
    }

    return res.status(200).json(updatedVacationSchedule);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateViolation = async (req, res) => {
  try {
    const updatedViolation = await Violation.findByIdAndUpdate(
      req.params.violationId,
      req.body
    );

    if (!updatedViolation) {
      return res.status(404).json({ message: "violation không tồn tại" });
    }

    return res.status(200).json(updatedViolation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getTimeTable = async (req, res) => {
  try {
    const TimeTable = require("../models/time_table");
    const timeTable = await TimeTable.findOne({
      studentId: req.params.studentId,
    }).populate("studentId");

    if (!timeTable) {
      return res.status(404).json("Không tìm thấy lịch học của học viên này");
    }

    let results = [];
    if (timeTable.schedules && timeTable.schedules.length > 0) {
      timeTable.schedules.forEach((schedule) => {
        const data = {
          _id: schedule._id || Math.random().toString(36).substr(2, 9),
          fullName: timeTable.studentId.fullName,
          day: schedule.day,
          schoolWeek: schedule.schoolWeek,
          time: schedule.time,
          subject: schedule.subject,
          classroom: schedule.classroom,
        };

        results.push(data);
      });
    }

    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).populate([
      { path: "university", select: "universityCode universityName" },
      { path: "organization", select: "organizationName travelTime" },
      { path: "educationLevel", select: "levelName" },
      { path: "class", select: "className" },
    ]);

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    return res.status(200).json(student);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getHelpCookings = async (req, res) => {
  try {
    const { fullName, date } = req.query;
    let startOfDay, endOfDay;

    if (date) {
      // Parse date string to ISO 8601 format
      const isoDate = moment(date, "ddd MMM DD YYYY HH:mm:ss").toISOString();

      // Convert ISO 8601 string to Date object and get startOfDay and endOfDay
      startOfDay = moment(isoDate).startOf("day").toDate();
      endOfDay = moment(isoDate).endOf("day").toDate();
    }

    const students = await Student.find({});
    let results = [];

    students.forEach((student) => {
      student.helpCooking.forEach((helpCooking) => {
        const data = {
          _id: helpCooking._id,
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          location: helpCooking.location,
          dayHelpCooking: helpCooking.dayHelpCooking,
        };
        results.push(data);
      });
    });

    // Apply filters based on provided query parameters
    if (fullName && date) {
      results = results.filter(
        (result) =>
          result.fullName.toLowerCase().includes(fullName.toLowerCase()) &&
          result.dayHelpCooking >= startOfDay &&
          result.dayHelpCooking <= endOfDay
      );
    } else if (fullName) {
      results = results.filter((result) =>
        result.fullName.toLowerCase().includes(fullName.toLowerCase())
      );
    } else if (date) {
      results = results.filter((result) => {
        return (
          result.dayHelpCooking >= startOfDay &&
          result.dayHelpCooking <= endOfDay
        );
      });
    }

    results.sort(
      (a, b) => new Date(b.dayHelpCooking) - new Date(a.dayHelpCooking)
    );

    return res.json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const getHelpCookingByDate = async (req, res) => {
  try {
    const currentDate = new Date().toISOString().split("T")[0];

    const students = await Student.find();
    let results = [];

    students.forEach((student) => {
      student.helpCooking.forEach((helpCooking) => {
        if (helpCooking.dayHelpCooking === currentDate) {
          results.push(helpCooking);
        }
      });
    });

    return res.status(200).json(results.length);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getLearningClassification = async (req, res) => {
  try {
    const students = await Student.find();

    let data = [
      { classification: "yếu", count: 0 },
      { classification: "Trung bình", count: 0 },
      { classification: "Khá", count: 0 },
      { classification: "Giỏi", count: 0 },
      { classification: "Xuất sắc", count: 0 },
    ];

    // Tạo một mảng chứa tất cả các học kỳ
    let allSemesters = [];
    students.forEach((student) => {
      student.learningInformation.forEach((info) => {
        allSemesters.push(info.semester);
      });
    });

    // Lọc ra học kỳ lớn nhất từ mảng
    const maxSemester = allSemesters.reduce((max, current) => {
      return max > current ? max : current;
    });

    if (!maxSemester) {
      return res.status(404).json({ message: "Không tìm thấy học kỳ nào." });
    }

    students.forEach((student) => {
      student.learningInformation.forEach((learningInformation) => {
        if (learningInformation.semester === maxSemester) {
          if (learningInformation.CPA <= 1.995) data[0].count++;
          else if (learningInformation.CPA <= 2.495) data[1].count++;
          else if (learningInformation.CPA <= 3.195) data[2].count++;
          else if (learningInformation.CPA <= 3.595) data[3].count++;
          else data[4].count++;
        }
      });
    });

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getLearningResultBySemester = async (req, res) => {
  try {
    const students = await Student.find();

    let data = [
      { classification: "yếu", count: 0 },
      { classification: "Trung bình", count: 0 },
      { classification: "Khá", count: 0 },
      { classification: "Giỏi", count: 0 },
      { classification: "Xuất sắc", count: 0 },
    ];

    // Tạo một mảng chứa tất cả các học kỳ
    let allSemesters = [];
    students.forEach((student) => {
      student.learningInformation.forEach((info) => {
        allSemesters.push(info.semester);
      });
    });

    // Lọc ra học kỳ lớn nhất từ mảng
    const maxSemester = allSemesters.reduce((max, current) => {
      return max > current ? max : current;
    });

    if (!maxSemester) {
      return res.status(404).json({ message: "Không tìm thấy học kỳ nào." });
    }

    students.forEach((student) => {
      student.learningInformation.forEach((learningInformation) => {
        if (learningInformation.semester === maxSemester) {
          if (learningInformation.GPA <= 1.995) data[0].count++;
          else if (learningInformation.GPA <= 2.495) data[1].count++;
          else if (learningInformation.GPA <= 3.195) data[2].count++;
          else if (learningInformation.GPA <= 3.595) data[3].count++;
          else data[4].count++;
        }
      });
    });

    res.status(200).json({ maxSemester: maxSemester, data: data });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

const getListSuggestedReward = async (req, res) => {
  try {
    const students = await Student.find();

    // Tạo một mảng chứa tất cả các học kỳ
    let allSemesters = [];
    students.forEach((student) => {
      student.learningInformation.forEach((info) => {
        allSemesters.push(info.semester);
      });
    });

    // Lọc ra học kỳ lớn nhất từ mảng
    const maxSemester = allSemesters.reduce((max, current) => {
      return max > current ? max : current;
    }, "");

    if (!maxSemester) {
      return res.status(404).json({ message: "Không tìm thấy học kỳ nào." });
    }

    // Danh sách học viên đạt yêu cầu
    let suggestedRewards = [];

    students.forEach((student) => {
      let meetsCriteria = false;
      let currentGPA = 0;

      student.learningInformation.forEach((learningInformation) => {
        if (
          learningInformation.semester === maxSemester &&
          learningInformation.GPA >= 2.995
        ) {
          meetsCriteria = true;
          currentGPA = learningInformation.GPA;
        }
      });

      student.physicalResult.forEach((physicalResult) => {
        if (physicalResult.semester === maxSemester) {
          const { practise } = physicalResult;
          if (practise === "Tốt" || practise === "Xuất sắc") {
            if (meetsCriteria) {
              suggestedRewards.push({
                fullName: student.fullName,
                unit: student.unit,
                university: student.university,
                GPA: currentGPA,
                practise: practise,
              });
            }
          }
        }
      });
    });

    return res.status(200).json({ suggestedRewards, maxSemester });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createNotification = async (req, res) => {
  const { title, content, dateIssued, author } = req.body;
  const attachments = req.file ? req.file.buffer.toString("base64") : null;

  try {
    // Lấy danh sách tất cả học sinh
    const students = await Student.find({});

    // Tạo thông báo mới
    const notification = {
      title: title,
      content: content,
      dateIssued: dateIssued,
      author: author,
      attachments: attachments,
    };

    // Thêm thông báo vào collection RegulatoryDocument
    const savedNotification = await RegulatoryDocument.create(notification);
    const notificationId = savedNotification._id;

    // Tạo danh sách thông báo cho từng học sinh
    const studentNotifications = students.map((student) => ({
      studentId: student._id,
      notificationId,
      isRead: false,
      createdAt: new Date(),
    }));

    // Thêm thông báo cho từng học sinh vào collection StudentNotifications
    await StudentNotifications.insertMany(studentNotifications);
    return res
      .status(201)
      .json("Thêm thông báo thành công cho tất cả học viên");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const updateIsRead = async (req, res) => {
  const { userId, notificationId } = req.params;
  const { isRead } = req.body;

  try {
    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const result = await StudentNotifications.updateOne(
      {
        studentId: student._id,
        notificationId: notificationId,
      },
      { $set: { isRead: isRead } }
    );

    if (result.nModified === 0) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông báo hoặc không có thay đổi" });
    }

    return res
      .status(200)
      .json({ message: "Cập nhật trạng thái đọc thành công" });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getStudentNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const studentNotifications = await StudentNotifications.find({
      studentId: student._id,
    })
      .populate("notificationId")
      .exec();

    const notifications = studentNotifications.map((sn) => ({
      ...sn.notificationId.toObject(),
      isRead: sn.isRead,
      studentNotificationId: sn._id,
    }));

    return res.status(200).json(notifications);
  } catch (err) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;
  try {
    // Xóa thông báo từ collection RegulatoryDocument
    const result = await RegulatoryDocument.findByIdAndDelete(notificationId);

    if (!result) {
      return res.status(404).json("Không tìm thấy văn bản");
    }

    // Xóa tất cả các bản ghi liên quan trong collection StudentNotifications
    await StudentNotifications.deleteMany({ notificationId });

    return res.status(200).json("Xóa văn bản thành công");
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const updateNotification = async (req, res) => {
  const { notificationId } = req.params;
  const { title, content, dateIssued, author } = req.body;
  const attachments = req.file ? req.file.buffer.toString("base64") : null;

  try {
    const updatedFields = {
      title,
      content,
      dateIssued,
      author,
      attachments,
      updatedAt: new Date(),
    };

    // Xóa các trường không có trong req.body để không ghi đè giá trị cũ bằng undefined
    Object.keys(updatedFields).forEach((key) => {
      if (updatedFields[key] === undefined) {
        delete updatedFields[key];
      }
    });

    const result = await RegulatoryDocument.findByIdAndUpdate(
      notificationId,
      { $set: updatedFields },
      { new: true }
    );

    if (!result) {
      return res.status(404).json("Không tìm thấy văn bản");
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const getExcelCutRice = async (req, res) => {
  const students = await Student.find({});

  const cutRices = [];

  students.forEach((student) => {
    student.cutRice.forEach((cutRice) => {
      cutRices.push({
        _id: cutRice._id,
        studentId: student._id,
        fullName: student.fullName,
        unit: student.unit,
        monday: cutRice.monday,
        tuesday: cutRice.tuesday,
        wednesday: cutRice.wednesday,
        thursday: cutRice.thursday,
        friday: cutRice.friday,
        saturday: cutRice.saturday,
        sunday: cutRice.sunday,
      });
    });
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Danh sách cắt cơm học viên H5");

  // Thêm tiêu đề lớn
  worksheet.mergeCells("B2:I2");
  worksheet.getCell("B2").value = "HỌC VIỆN KHOA HỌC QUÂN SỰ";
  worksheet.getCell("B2").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("B2").font = {
    name: "Times New Roman",
    size: 13,
  };

  worksheet.mergeCells("D3:G3");
  worksheet.getCell("D3").value = "HỆ HỌC VIÊN 5";
  worksheet.getCell("D3").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("D3").font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  worksheet.mergeCells("G7:N7");
  worksheet.getCell("G7").value = "DANH SÁCH CẮT CƠM CỦA HỌC VIÊN HỆ 5";
  worksheet.getCell("G7").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("G7").font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  worksheet.mergeCells("M2:S2");
  worksheet.getCell("M2").value = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
  worksheet.getCell("M2").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("M2").font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  worksheet.mergeCells("N3:R3");
  worksheet.getCell("N3").value = "Độc lập - Tự do - Hạnh phúc";
  worksheet.getCell("N3").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("N3").font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  worksheet.mergeCells("O5:R5");
  worksheet.getCell("O5").value = "Hà Nội, ngày ... tháng ... năm 2025";
  worksheet.getCell("O5").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("O5").font = { name: "Times New Roman", size: 13 };

  // Thêm hàng trống thứ 8, 9
  worksheet.addRow([]);
  worksheet.addRow([]);

  // Định nghĩa các cột và merge cells cho header
  worksheet.mergeCells("A10:A11");
  worksheet.getCell("A10").value = "Họ và tên";
  worksheet.getCell("A10").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("A10").font = { name: "Times New Roman", size: 13 };

  const days = [
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "Chủ nhật",
  ];
  const meals = ["Sáng", "Trưa", "Chiều"];

  days.forEach((day, i) => {
    worksheet.mergeCells(10, i * 3 + 2, 10, i * 3 + 4);
    worksheet.getCell(10, i * 3 + 2).value = day;
    worksheet.getCell(10, i * 3 + 2).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell(10, i * 3 + 2).font = {
      name: "Times New Roman",
      size: 13,
    };

    meals.forEach((meal, j) => {
      worksheet.getCell(11, i * 3 + 2 + j).value = meal;
      worksheet.getCell(11, i * 3 + 2 + j).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell(11, i * 3 + 2 + j).font = {
        name: "Times New Roman",
        size: 13,
      };
    });
  });

  // Thêm dữ liệu
  cutRices.forEach((record, index) => {
    const row = [
      record.fullName,
      record.monday.breakfast ? "x" : "",
      record.monday.lunch ? "x" : "",
      record.monday.dinner ? "x" : "",
      record.tuesday.breakfast ? "x" : "",
      record.tuesday.lunch ? "x" : "",
      record.tuesday.dinner ? "x" : "",
      record.wednesday.breakfast ? "x" : "",
      record.wednesday.lunch ? "x" : "",
      record.wednesday.dinner ? "x" : "",
      record.thursday.breakfast ? "x" : "",
      record.thursday.lunch ? "x" : "",
      record.thursday.dinner ? "x" : "",
      record.friday.breakfast ? "x" : "",
      record.friday.lunch ? "x" : "",
      record.friday.dinner ? "x" : "",
      record.saturday.breakfast ? "x" : "",
      record.saturday.lunch ? "x" : "",
      record.saturday.dinner ? "x" : "",
      record.sunday.breakfast ? "x" : "",
      record.sunday.lunch ? "x" : "",
      record.sunday.dinner ? "x" : "",
    ];
    const addedRow = worksheet.addRow(row);
    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Times New Roman", size: 13 };
      // Căn giữa cho tất cả các ô dữ liệu
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });
  });

  // Định nghĩa border cho tất cả các ô trong bảng
  const totalColumns = 24; // Số cột từ 'Họ và tên' tới 'Chủ nhật' (tăng 2 do merge cột Họ và tên)
  const totalRows = cutRices.length + 11; // Tổng số hàng bao gồm header và dữ liệu

  for (let i = 10; i <= totalRows; i++) {
    for (let j = 1; j <= totalColumns; j++) {
      worksheet.getCell(i, j).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  worksheet.mergeCells(`Q${totalRows + 3}:T${totalRows + 3}`);
  worksheet.getCell(`Q${totalRows + 3}`).value = "PHÓ HỆ TRƯỞNG";
  worksheet.getCell(`Q${totalRows + 3}`).alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell(`Q${totalRows + 3}`).font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  worksheet.mergeCells(`Q${totalRows + 6}:T${totalRows + 6}`);
  worksheet.getCell(`Q${totalRows + 6}`).value = "Phạm Hữu Khôi";
  worksheet.getCell(`Q${totalRows + 6}`).alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell(`Q${totalRows + 6}`).font = {
    name: "Times New Roman",
    size: 13,
    bold: true,
  };

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=danh_sach_cat_com_h5.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
};

const getPdfLearningResult = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;
    const students = await Student.find();
    let learningResults = [];

    students.forEach((student) => {
      student.learningInformation.forEach((learningInformation) => {
        learningResults.push({
          _id: learningInformation._id,
          fullName: student.fullName,
          university: student.university,
          semester: learningInformation.semester,
          CPA: learningInformation.CPA,
          GPA: learningInformation.GPA,
          cumulativeCredit: learningInformation.cumulativeCredit,
          studentLevel: learningInformation.studentLevel,
          warningLevel: learningInformation.warningLevel,
          totalDebt: learningInformation.totalDebt,
        });
      });
    });

    learningResults = learningResults.filter((learningResult) => {
      return learningResult.semester === semesterQuery;
    });

    const doc = new PDFDocument({
      margins: {
        top: 2.5 * 28.35, // 1cm = 28.35 points
        left: 3.5 * 28.35,
        right: 2 * 28.35,
        bottom: 2.5 * 28.35,
      },
    });

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=Thong_ke_ket_qua_hoc_tap_he5_hoc_ky_${semesterQuery}.pdf`,
        })
        .end(pdfData);
    });

    const fontPathBold = path.join(__dirname, "fonts", "Roboto-Bold.ttf");
    doc.registerFont("Roboto-Bold", fontPathBold);

    const fontPathRegular = path.join(__dirname, "fonts", "Roboto-Regular.ttf");
    doc.registerFont("Roboto-Regular", fontPathRegular);

    const fontPathItalic = path.join(
      __dirname,
      "fonts",
      "Roboto-LightItalic.ttf"
    );
    doc.registerFont("Roboto-LightItalic", fontPathItalic);

    const tableHeaderWidths = [100, 105, 35, 35, 60, 80, 50];
    const tableStartX = 3.5 * 28.35;

    // Add initial header
    const addHeader = () => {
      doc
        .font("Roboto-Regular")
        .fontSize(13)
        .text("HỌC VIỆN KTQS", {
          align: "left",
          continued: true,
        })
        .font("Roboto-Bold")
        .text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", {
          align: "right",
        });

      doc.moveDown(0.3);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text(" HỆ HỌC VIÊN 5", {
          align: "left",
          continued: true,
        })
        .text("Độc lập - Tự do - Hạnh phúc", 260, 90, {
          align: "left",
        });

      doc.moveDown(1);
      doc
        .font("Roboto-LightItalic")
        .fontSize(13)
        .text("Hà Nội, ngày ... tháng ... năm 20...", {
          align: "right",
        });

      doc.moveDown(2);
      doc.font("Roboto-Bold").fontSize(15).text("BÁO CÁO", { align: "center" });

      doc.moveDown(0.5);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text("Thống kê kết quả học tập học kỳ " + semesterQuery, {
          align: "center",
        });

      doc.moveDown(1.5);
      doc.font("Roboto-LightItalic").fontSize(13).text("*Hệ học viên 5", {
        align: "left",
      });

      doc.moveDown(0.2);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text("1. Kết quả học tập", { align: "left" });

      // Table Headers
      doc.moveDown(0.5);
      const tableTop = doc.y; // Define tableTop here

      const tableHeaders = [
        "Họ và tên",
        "Trường đại học",
        "GPA",
        "CPA",
        "TC tích lũy",
        "TC nợ đăng ký",
        "Trình độ",
      ];

      // Draw table header lines
      const headerY = doc.y;
      doc
        .moveTo(tableStartX, headerY)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          headerY
        )
        .stroke();

      doc.font("Roboto-Bold").fontSize(11);
      tableHeaders.forEach((header, i) => {
        doc.text(
          header,
          tableStartX +
            tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
          tableTop,
          {
            width: tableHeaderWidths[i],
            align: "center",
          }
        );
      });

      // Draw vertical lines for header
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, headerY)
          .lineTo(verticalX, headerY + 25) // Extend header line downwards
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for header
      doc
        .moveTo(verticalX, headerY)
        .lineTo(verticalX, headerY + 25) // Extend header line downwards
        .stroke();

      doc.moveDown(0.3);

      return tableTop; // Return tableTop
    };

    // Function to add rows
    const addRows = (results, startIndex, tableTop) => {
      doc.font("Roboto-Regular").fontSize(10);
      const rowHeight = 15;
      const tableTopY = doc.y + 8;
      results.slice(startIndex, startIndex + 16).forEach((result) => {
        const row = [
          result.fullName,
          result.university.replace("Đại học ", "").trim(),
          result.GPA !== undefined ? result.GPA.toFixed(2) : "N/A",
          result.CPA !== undefined ? result.CPA.toFixed(2) : "N/A",
          result.cumulativeCredit !== undefined
            ? result.cumulativeCredit + " tín chỉ"
            : "N/A",
          result.totalDebt !== undefined
            ? result.totalDebt + " tín chỉ"
            : "N/A",
          result.studentLevel !== undefined
            ? "Năm " + result.studentLevel
            : "N/A",
        ];

        const rowTop = doc.y + rowHeight;
        row.forEach((cell, i) => {
          doc.text(
            cell,
            tableStartX +
              tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
            rowTop,
            {
              width: tableHeaderWidths[i],
              align: "center",
            }
          );
        });

        // Draw row lines
        doc
          .moveTo(tableStartX, rowTop - rowHeight / 2)
          .lineTo(
            tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
            rowTop - rowHeight / 2
          )
          .stroke();
      });

      const rowTop = doc.y + rowHeight;
      doc
        .moveTo(tableStartX, rowTop - rowHeight / 2)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          rowTop - rowHeight / 2
        )
        .stroke();

      // Draw vertical lines for table rows
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, tableTopY)
          .lineTo(verticalX, doc.y + 8)
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for rows
      doc
        .moveTo(verticalX, tableTopY)
        .lineTo(verticalX, doc.y + 8)
        .stroke();
    };

    // Initial Header
    let tableTop = addHeader();

    // Add rows with pagination
    let startIndex = 0;
    while (startIndex < learningResults.length) {
      if (startIndex > 0) {
        doc.addPage();
      }
      addRows(learningResults, startIndex, tableTop);
      startIndex += 16;
    }

    const addSignature = () => {
      const pageWidth = doc.page.width;
      const signatureX = pageWidth - 2.5 * 28.35 - 100;
      const signatureY = doc.y + 28.35;

      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text("HỆ TRƯỞNG", signatureX, signatureY, { align: "center" });

      doc.moveDown(3);
      doc
        .font("Roboto-Regular")
        .fontSize(12)
        .text("Nguyễn Văn Minh", signatureX, doc.y, { align: "center" });
    };

    addSignature();

    doc.end();
  } catch (error) {
    res.status(500).send(error.toString());
  }
};

const getPdfTuitionFee = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;
    const students = await Student.find();
    let tuitionFees = [];

    students.forEach((student) => {
      student.tuitionFee.forEach((tuitionFee) => {
        tuitionFees.push({
          _id: tuitionFee._id,
          fullName: student.fullName,
          university: student.university,
          totalAmount: tuitionFee.totalAmount,
          semester: tuitionFee.semester,
          content: tuitionFee.content,
          status: tuitionFee.status,
        });
      });
    });

    if (semesterQuery) {
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return tuitionFee.semester === semesterQuery;
      });
    }

    const totalAmountSum = tuitionFees.reduce((sum, tuitionFee) => {
      return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
    }, 0);

    const doc = new PDFDocument({
      margins: {
        top: 2.5 * 28.35, // 1cm = 28.35 points
        left: 3.5 * 28.35,
        right: 2 * 28.35,
        bottom: 2.5 * 28.35,
      },
    });

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=Thong_ke_hoc_phi_he5_hoc_ky_${semesterQuery}.pdf`,
        })
        .end(pdfData);
    });

    const fontPathBold = path.join(__dirname, "fonts", "Roboto-Bold.ttf");
    doc.registerFont("Roboto-Bold", fontPathBold);

    const fontPathRegular = path.join(__dirname, "fonts", "Roboto-Regular.ttf");
    doc.registerFont("Roboto-Regular", fontPathRegular);

    const fontPathItalic = path.join(
      __dirname,
      "fonts",
      "Roboto-LightItalic.ttf"
    );
    doc.registerFont("Roboto-LightItalic", fontPathItalic);

    const tableHeaderWidths = [100, 95, 145, 60, 60];
    const tableStartX = 3.5 * 28.35;

    // Add initial header
    const addHeader = () => {
      doc
        .font("Roboto-Regular")
        .fontSize(13)
        .text("HỌC VIỆN KTQS", {
          align: "left",
          continued: true,
        })
        .font("Roboto-Bold")
        .text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", {
          align: "right",
        });

      doc.moveDown(0.3);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text(" HỆ HỌC VIÊN 5", {
          align: "left",
          continued: true,
        })
        .text("Độc lập - Tự do - Hạnh phúc", 260, 90, {
          align: "left",
        });

      doc.moveDown(1);
      doc
        .font("Roboto-LightItalic")
        .fontSize(13)
        .text("Hà Nội, ngày ... tháng ... năm 20...", {
          align: "right",
        });

      doc.moveDown(2);
      doc.font("Roboto-Bold").fontSize(15).text("BÁO CÁO", { align: "center" });

      doc.moveDown(0.5);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text("Thống kê học phí học kỳ " + semesterQuery, {
          align: "center",
        });

      doc.moveDown(1.5);
      doc.font("Roboto-LightItalic").fontSize(13).text("*Hệ học viên 5", {
        align: "left",
      });

      doc.moveDown(0.2);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text(
          "1. Tổng số tiền học phí học kỳ " +
            semesterQuery +
            ": " +
            totalAmountSum.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            }),
          {
            align: "left",
          }
        );

      // Table Headers
      doc.moveDown(0.5);
      const tableTop = doc.y; // Define tableTop here

      const tableHeaders = [
        "Họ và tên",
        "Trường đại học",
        "Loại tiền phải đóng",
        "Số tiền(đ)",
        "Trạng thái",
      ];

      // Draw table header lines
      const headerY = doc.y;
      doc
        .moveTo(tableStartX, headerY)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          headerY
        )
        .stroke();

      doc.font("Roboto-Bold").fontSize(11);
      tableHeaders.forEach((header, i) => {
        doc.text(
          header,
          tableStartX +
            tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
          tableTop,
          {
            width: tableHeaderWidths[i],
            align: "center",
          }
        );
      });

      // Draw vertical lines for header
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, headerY)
          .lineTo(verticalX, headerY + 25) // Extend header line downwards
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for header
      doc
        .moveTo(verticalX, headerY)
        .lineTo(verticalX, headerY + 25) // Extend header line downwards
        .stroke();

      doc.moveDown(0.3);

      return tableTop; // Return tableTop
    };

    // Function to add rows
    const addRows = (results, startIndex, tableTop) => {
      doc.font("Roboto-Regular").fontSize(10);
      const rowHeight = 15;
      const tableTopY = doc.y + 8;
      results.slice(startIndex, startIndex + 16).forEach((result) => {
        const row = [
          result.fullName,
          result.university.replace("Đại học ", "").trim(),
          result.content
            .replace("Tổng ", "")
            .replace("học kỳ", "HK")
            .replace("học phí", "HP"),
          result.totalAmount,
          result.status,
        ];

        const rowTop = doc.y + rowHeight;
        row.forEach((cell, i) => {
          doc.text(
            cell,
            tableStartX +
              tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
            rowTop,
            {
              width: tableHeaderWidths[i],
              align: "center",
            }
          );
        });

        // Draw row lines
        doc
          .moveTo(tableStartX, rowTop - rowHeight / 2)
          .lineTo(
            tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
            rowTop - rowHeight / 2
          )
          .stroke();
      });

      const rowTop = doc.y + rowHeight;
      doc
        .moveTo(tableStartX, rowTop - rowHeight / 2)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          rowTop - rowHeight / 2
        )
        .stroke();

      // Draw vertical lines for table rows
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, tableTopY)
          .lineTo(verticalX, doc.y + 8)
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for rows
      doc
        .moveTo(verticalX, tableTopY)
        .lineTo(verticalX, doc.y + 8)
        .stroke();
    };

    // Initial Header
    let tableTop = addHeader();

    // Add rows with pagination
    let startIndex = 0;
    while (startIndex < tuitionFees.length) {
      if (startIndex > 0) {
        doc.addPage();
      }
      addRows(tuitionFees, startIndex, tableTop);
      startIndex += 16;
    }

    const addSignature = () => {
      const pageWidth = doc.page.width;
      const signatureX = pageWidth - 2.5 * 28.35 - 100;
      const signatureY = doc.y + 28.35;

      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text("HỆ TRƯỞNG", signatureX, signatureY, { align: "center" });

      doc.moveDown(3);
      doc
        .font("Roboto-Regular")
        .fontSize(12)
        .text("Nguyễn Văn Minh", signatureX, doc.y, { align: "center" });
    };

    addSignature();

    doc.end();
  } catch (error) {
    res.status(500).send(error.toString());
  }
};

const getPdfPhysicalResutl = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;
    const students = await Student.find();
    let physicalResults = [];

    students.forEach((student) => {
      student.physicalResult.forEach((physicalResult) => {
        physicalResults.push({
          _id: physicalResult._id,
          fullName: student.fullName,
          unit: student.unit,
          studentId: student._id,
          semester: physicalResult.semester,
          run3000m: physicalResult.run3000m,
          run100m: physicalResult.run100m,
          pullUpBar: physicalResult.pullUpBar,
          swimming100m: physicalResult.swimming100m,
          practise: physicalResult.practise,
        });
      });
    });
    if (semesterQuery) {
      physicalResults = physicalResults.filter((achievement) => {
        return achievement.semester === semesterQuery;
      });
    }
    physicalResults.sort((a, b) => {
      const [yearA, semesterA] = a.semester.split(".");
      const [yearB, semesterB] = b.semester.split(".");
      // So sánh năm trước
      if (yearA !== yearB) {
        return yearB - yearA;
      }
      // Nếu cùng năm, so sánh theo học kỳ
      return semesterB - semesterA;
    });

    const doc = new PDFDocument({
      margins: {
        top: 2.5 * 28.35, // 1cm = 28.35 points
        left: 3.5 * 28.35,
        right: 2 * 28.35,
        bottom: 2.5 * 28.35,
      },
    });

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);
      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=${
            semesterQuery
              ? "Ket_qua_ren_luyen_hoc_ky_" + semesterQuery
              : "Ket_qua_ren_luyen_the_luc_toan_khoa"
          }.pdf`,
        })
        .end(pdfData);
    });

    const fontPathBold = path.join(__dirname, "fonts", "Roboto-Bold.ttf");
    doc.registerFont("Roboto-Bold", fontPathBold);

    const fontPathRegular = path.join(__dirname, "fonts", "Roboto-Regular.ttf");
    doc.registerFont("Roboto-Regular", fontPathRegular);

    const fontPathItalic = path.join(
      __dirname,
      "fonts",
      "Roboto-LightItalic.ttf"
    );
    doc.registerFont("Roboto-LightItalic", fontPathItalic);

    const tableHeaderWidths = [100, 50, 70, 75, 55, 55, 55];
    const tableStartX = 3.5 * 28.35;

    // Add initial header
    const addHeader = () => {
      doc
        .font("Roboto-Regular")
        .fontSize(13)
        .text("HỌC VIỆN KTQS", {
          align: "left",
          continued: true,
        })
        .font("Roboto-Bold")
        .text("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", {
          align: "right",
        });

      doc.moveDown(0.3);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text(" HỆ HỌC VIÊN 5", {
          align: "left",
          continued: true,
        })
        .text("Độc lập - Tự do - Hạnh phúc", 260, 90, {
          align: "left",
        });

      doc.moveDown(1);
      doc
        .font("Roboto-LightItalic")
        .fontSize(13)
        .text("Hà Nội, ngày ... tháng ... năm 20...", {
          align: "right",
        });

      doc.moveDown(2);
      doc.font("Roboto-Bold").fontSize(15).text("BÁO CÁO", { align: "center" });

      doc.moveDown(0.5);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text("Thống kê kết quả rèn luyện thể lực", {
          align: "center",
        });

      doc.moveDown(1.5);
      doc.font("Roboto-LightItalic").fontSize(13).text("*Hệ học viên 5", {
        align: "left",
      });

      doc.moveDown(0.2);
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text(
          `${
            semesterQuery
              ? "1. Kết quả rèn luyện học kỳ " + semesterQuery
              : "1. Kết quả rèn luyện thể lực toàn khóa"
          }`,
          {
            align: "left",
          }
        );

      // Table Headers
      doc.moveDown(0.5);
      const tableTop = doc.y; // Define tableTop here

      const tableHeaders = [
        "Họ và tên",
        "Đơn vị",
        "Chạy 100m",
        "Chạy 3000m",
        "Xà đơn",
        "Bơi",
        "Xếp loại",
      ];

      // Draw table header lines
      const headerY = doc.y;
      doc
        .moveTo(tableStartX, headerY)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          headerY
        )
        .stroke();

      doc.font("Roboto-Bold").fontSize(11);
      tableHeaders.forEach((header, i) => {
        doc.text(
          header,
          tableStartX +
            tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
          tableTop,
          {
            width: tableHeaderWidths[i],
            align: "center",
          }
        );
      });

      // Draw vertical lines for header
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, headerY)
          .lineTo(verticalX, headerY + 25) // Extend header line downwards
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for header
      doc
        .moveTo(verticalX, headerY)
        .lineTo(verticalX, headerY + 25) // Extend header line downwards
        .stroke();

      doc.moveDown(0.3);

      return tableTop; // Return tableTop
    };

    // Function to add rows
    const addRows = (results, startIndex, tableTop) => {
      doc.font("Roboto-Regular").fontSize(10);
      const rowHeight = 15;
      const tableTopY = doc.y + 8;
      results.slice(startIndex, startIndex + 16).forEach((result) => {
        const row = [
          result.fullName,
          result.unit,
          result.run100m,
          result.run3000m,
          result.pullUpBar,
          result.swimming100m,
          result.practise,
        ];

        const rowTop = doc.y + rowHeight;
        row.forEach((cell, i) => {
          doc.text(
            cell,
            tableStartX +
              tableHeaderWidths.slice(0, i).reduce((a, b) => a + b, 0),
            rowTop,
            {
              width: tableHeaderWidths[i],
              align: "center",
            }
          );
        });

        // Draw row lines
        doc
          .moveTo(tableStartX, rowTop - rowHeight / 2)
          .lineTo(
            tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
            rowTop - rowHeight / 2
          )
          .stroke();
      });

      const rowTop = doc.y + rowHeight;
      doc
        .moveTo(tableStartX, rowTop - rowHeight / 2)
        .lineTo(
          tableStartX + tableHeaderWidths.reduce((a, b) => a + b, 0),
          rowTop - rowHeight / 2
        )
        .stroke();

      // Draw vertical lines for table rows
      let verticalX = tableStartX;
      tableHeaderWidths.forEach((width) => {
        doc
          .moveTo(verticalX, tableTopY)
          .lineTo(verticalX, doc.y + 8)
          .stroke();
        verticalX += width;
      });

      // Rightmost vertical line for rows
      doc
        .moveTo(verticalX, tableTopY)
        .lineTo(verticalX, doc.y + 8)
        .stroke();
    };

    // Initial Header
    let tableTop = addHeader();

    // Add rows with pagination
    let startIndex = 0;
    while (startIndex < physicalResults.length) {
      if (startIndex > 0) {
        doc.addPage();
      }
      addRows(physicalResults, startIndex, tableTop);
      startIndex += 16;
    }

    const addSignature = () => {
      const pageWidth = doc.page.width;
      const signatureX = pageWidth - 2.5 * 28.35 - 100;
      const signatureY = doc.y + 28.35;

      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text("HỆ TRƯỞNG", signatureX, signatureY, { align: "center" });

      doc.moveDown(3);
      doc
        .font("Roboto-Regular")
        .fontSize(12)
        .text("Bùi Đình Thế", signatureX, doc.y, { align: "center" });
    };

    addSignature();

    doc.end();
  } catch (error) {
    res.status(500).send(error.toString());
  }
};

const getListSuggestedRewardWord = async (req, res) => {
  try {
    const students = await Student.find();

    const suggestedRewards = [];

    students.forEach((student) => {
      student.achievement.forEach((achievement) => {
        if (achievement.status === "suggested") {
          suggestedRewards.push({
            _id: achievement._id,
            fullName: student.fullName,
            unit: student.unit,
            title: achievement.title,
            description: achievement.description,
            points: achievement.points,
            status: achievement.status,
          });
        }
      });
    });

    return res.status(200).json(suggestedRewards);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Admin chỉnh sửa lịch cắt cơm của student
const updateStudentCutRice = async (req, res) => {
  try {
    const { studentId } = req.params;
    const cutRiceData = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Luôn chỉ lấy lịch cắt cơm đầu tiên (mỗi sinh viên chỉ có 1 lịch)
    const currentCutRice = student.cutRice[0];
    if (!currentCutRice) {
      return res.status(404).json({ message: "Không tìm thấy lịch cắt cơm" });
    }

    // Cập nhật lịch hiện có
    Object.assign(currentCutRice, cutRiceData);
    currentCutRice.isAutoGenerated = false;
    currentCutRice.lastUpdated = new Date();
    currentCutRice.notes = "Được chỉnh sửa bởi admin";

    await student.save();

    return res.status(200).json({
      message: "Cập nhật lịch cắt cơm thành công",
      cutRice: currentCutRice,
    });
  } catch (error) {
    console.error("Error updating student cut rice:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo lịch cắt cơm tự động cho tất cả students
const generateAutoCutRiceForAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    const autoCutRiceService = require("../services/autoCutRiceService");

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const student of students) {
      try {
        const cutRiceSchedule = await autoCutRiceService.updateAutoCutRice(
          student._id
        );
        successCount++;
        results.push({
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          status: "success",
          schedule: cutRiceSchedule,
        });
      } catch (error) {
        errorCount++;
        results.push({
          studentId: student._id,
          fullName: student.fullName,
          unit: student.unit,
          status: "error",
          error: error.message,
        });
        console.error(
          `Error generating auto cut rice for student ${student.fullName}:`,
          error
        );
      }
    }

    return res.status(200).json({
      message: `Tạo lịch cắt cơm tự động hoàn tất. Thành công: ${successCount}, Lỗi: ${errorCount}`,
      totalStudents: students.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error("Error generating auto cut rice for all students:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy lịch cắt cơm chi tiết theo ID
const getCutRiceDetail = async (req, res) => {
  try {
    const cutRiceId = req.params.cutRiceId;

    // Tìm sinh viên có lịch cắt cơm với ID này
    const student = await Student.findOne({
      "cutRice._id": cutRiceId,
    });

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy lịch cắt cơm" });
    }

    // Tìm lịch cắt cơm cụ thể theo ID
    const cutRice = student.cutRice.id(cutRiceId);

    if (!cutRice) {
      return res.status(404).json({ message: "Không tìm thấy lịch cắt cơm" });
    }

    return res.status(200).json(cutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tạo lịch cắt cơm tự động cho 1 sinh viên
const generateAutoCutRiceForStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Gọi service tạo lịch cắt cơm tự động cho sinh viên này
    const autoCutRiceService = require("../services/autoCutRiceService");
    const newCutRiceSchedule = await autoCutRiceService.updateAutoCutRice(
      student._id
    );

    // Ghi đè lịch cắt cơm hiện tại
    if (student.cutRice.length > 0) {
      student.cutRice[0] = {
        ...newCutRiceSchedule,
        isAutoGenerated: true,
        lastUpdated: new Date(),
        notes: "Tự động tạo dựa trên lịch học",
      };
    } else {
      student.cutRice.push({
        ...newCutRiceSchedule,
        isAutoGenerated: true,
        lastUpdated: new Date(),
        notes: "Tự động tạo dựa trên lịch học",
      });
    }
    await student.save();

    return res.status(200).json({
      message: "Tạo lại lịch cắt cơm tự động thành công",
      cutRice: student.cutRice[0],
    });
  } catch (error) {
    console.error("Error generating auto cut rice for student:", error);
    return res.status(500).json({ message: "Lỗi server" });
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
      currentAddress,
      email,
      phoneNumber,
      enrollment,
      class: newClassId,
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

    // Lấy thông tin sinh viên hiện tại để so sánh lớp
    const currentStudent = await Student.findById(req.params.studentId);
    if (!currentStudent) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const oldClassId = currentStudent.class;

    const updateData = {
      studentId: newStudentId,
      fullName,
      gender,
      birthday,
      hometown,
      currentAddress,
      email,
      phoneNumber,
      enrollment,
      class: newClassId,
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
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });

    // Cập nhật số lượng sinh viên trong lớp nếu có thay đổi lớp
    if (oldClassId !== newClassId) {
      const classService = require("../services/classService");
      await classService.transferStudentClass(oldClassId, newClassId);
    }

    return res.status(200).json(updatedStudent);
  } catch (error) {
    console.error("Lỗi khi cập nhật sinh viên:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy tất cả điểm học tập của tất cả sinh viên
const getAllStudentsGrades = async (req, res) => {
  try {
    const { semester, schoolYear } = req.query;
    console.log("=== getAllStudentsGrades START ===");
    console.log("Query parameters:", { semester, schoolYear });

    // Lấy tất cả students với thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    console.log("Total students found:", students.length);

    let allLearningResults = [];

    // Lặp qua từng student để lấy kết quả học tập
    for (const student of students) {
      console.log(
        `Processing student: ${student.fullName} (${student.studentId})`
      );

      try {
        // Lấy kết quả học tập từ student model
        const semesterResults = student.semesterResults || [];
        console.log(
          `  - Student has ${semesterResults.length} semester results`
        );

        // Log chi tiết semesterResults để debug
        if (semesterResults.length > 0) {
          console.log(
            `  - Semester results:`,
            semesterResults.map((r) => ({
              semester: r.semester,
              schoolYear: r.schoolYear,
              averageGrade4: r.averageGrade4,
              subjects: r.subjects?.length || 0,
            }))
          );
        } else {
          console.log(`  - No semester results found for this student`);
        }

        // Lọc theo semester và schoolYear nếu có
        let filteredResults = semesterResults;

        if (semester || schoolYear) {
          console.log(
            `  - Applying filters: semester=${semester}, schoolYear=${schoolYear}`
          );

          filteredResults = semesterResults.filter((result) => {
            let matches = true;

            // Lọc theo semester
            if (semester) {
              const semesterArray = semester.split(",").map((s) => s.trim());
              const semesterMatch = semesterArray.includes(result.semester);
              console.log(
                `    - Semester check: ${result.semester} in [${semesterArray}] = ${semesterMatch}`
              );
              matches = matches && semesterMatch;
            }

            // Lọc theo schoolYear
            if (schoolYear) {
              const schoolYearArray = schoolYear
                .split(",")
                .map((s) => s.trim());
              const schoolYearMatch = schoolYearArray.includes(
                result.schoolYear
              );
              console.log(
                `    - SchoolYear check: ${result.schoolYear} in [${schoolYearArray}] = ${schoolYearMatch}`
              );
              matches = matches && schoolYearMatch;
            }

            console.log(
              `    - Final match for ${result.semester}-${result.schoolYear}: ${matches}`
            );
            return matches;
          });

          console.log(`  - After filtering: ${filteredResults.length} results`);
        } else {
          console.log(
            `  - No filters applied, using all ${semesterResults.length} results`
          );
        }

        // Thêm thông tin student vào mỗi kết quả
        filteredResults.forEach((result) => {
          const learningResult = {
            _id: result._id,
            studentId: student._id,
            fullName: student.fullName,
            studentCode: student.studentId,
            university: student.university?.universityName || "",
            className: student.class?.className || "",
            semester: result.semester,
            schoolYear: result.schoolYear,
            GPA: result.averageGrade4?.toFixed(2) || "0.00",
            CPA: result.cumulativeGrade4?.toFixed(2) || "0.00",
            cumulativeCredit: result.cumulativeCredits || 0,
            totalDebt: result.totalDebt || 0,
            studentLevel: result.studentLevel || 1,
            warningLevel: result.warningLevel || 0,
            subjects: result.subjects || [],
            totalCredits: result.totalCredits || 0,
            averageGrade10: result.averageGrade10?.toFixed(2) || "0.00",
          };

          console.log(
            `  - Adding result: ${learningResult.fullName} - ${learningResult.semester} ${learningResult.schoolYear}`
          );
          allLearningResults.push(learningResult);
        });
      } catch (error) {
        console.log(`Error processing student ${student._id}:`, error);
      }
    }

    console.log("=== getAllStudentsGrades END ===");
    console.log("Final learning results count:", allLearningResults.length);
    console.log("Sample result:", allLearningResults[0]);

    return res.status(200).json(allLearningResults);
  } catch (error) {
    console.error("Error in getAllStudentsGrades:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  updateCommander,
  getCommander,
  deleteStudent,
  deleteCommander,
  getStudents,
  getAllStudent,
  getCommanders,
  createCommander,
  createStudent,
  updateAchievement,
  getAchievements,
  deleteAchievement,
  createAchievement,
  getHelpCooking,
  getHelpCookingByDate,
  updateHelpCooking,
  deleteHelpCooking,
  createHelpCooking,
  getPhysicalResult,
  updatePhysicalResult,
  deletePhysicalResult,
  createPhysicalResult,
  getVacationSchedule,
  getVacationScheduleByDate,
  createVacationSchedule,
  getViolation,
  deleteViolation,
  createViolation,
  getAllCutRice,
  getTuitionFees,
  getLearningResults,
  getVacationSchedules,
  deleteVacationSchedule,
  getPhysicalResults,
  getViolations,
  getRegulatoryDocuments,
  getRegulatoryDocument,
  getTimeTables,
  updateVacationSchedule,
  updateViolation,
  getTimeTable,
  getStudent,
  getHelpCookings,
  getAllCutRiceByDate,
  getLearningResultAll,
  getLearningClassification,
  getLearningResultBySemester,
  getListSuggestedReward,
  createNotification,
  updateIsRead,
  getStudentNotifications,
  deleteNotification,
  updateNotification,
  getExcelCutRice,
  getPdfLearningResult,
  getPdfPhysicalResutl,
  getPdfTuitionFee,
  getListSuggestedRewardWord,
  updateStudentCutRice,
  generateAutoCutRiceForAllStudents,
  getCutRiceDetail,
  generateAutoCutRiceForStudent,
  updateStudent,
  getAllStudentsGrades,
};
