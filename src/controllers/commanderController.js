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
const gradeHelper = require("../helpers/gradeHelper");
const User = require("../models/user");
const VacationSchedule = require("../models/vacation_schedule");
const Violation = require("../models/violation");
const RegulatoryDocument = require("../models/regulatory_document");
const StudentNotifications = require("../models/student_notifications");
const TimeTable = require("../models/time_table");

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

// Update tuition fee status
const updateTuitionFeeStatus = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student)
      return res.status(404).json({ message: "Không tìm thấy học viên" });

    const fee = student.tuitionFee.id(req.params.tuitionFeeId);
    if (!fee)
      return res.status(404).json({ message: "Không tìm thấy học phí" });

    const { status } = req.body;
    if (
      !status ||
      !["Đã thanh toán", "Chưa thanh toán", "Đã đóng", "Chưa đóng"].includes(
        status
      )
    ) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }

    fee.status = status;
    await student.save();

    // Tạo thông báo tới học viên về thay đổi trạng thái học phí
    try {
      const title = "Cập nhật trạng thái học phí";
      const docContent = `Trạng thái học phí đã được cập nhật.\n\n- Học kỳ: ${
        fee.semester || "-"
      }\n- Năm học: ${fee.schoolYear || "-"}\n- Loại tiền: ${
        fee.content || "-"
      }\n- Số tiền: ${fee.totalAmount || "-"}\n- Trạng thái mới: ${status}`;

      const doc = new RegulatoryDocument({
        title,
        content: docContent,
        dateIssued: new Date(),
        author: "Hệ Học viên 5",
        attachments: "",
      });
      await doc.save();

      await StudentNotifications.create({
        studentId: student._id,
        notificationId: doc._id,
        isRead: false,
      });
    } catch (notifyErr) {
      console.warn(
        "Không thể tạo thông báo học phí:",
        notifyErr?.message || notifyErr
      );
    }

    return res.status(200).json({ message: "Cập nhật trạng thái thành công" });
  } catch (e) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * limit;
  const { fullName, unit, enrollment, schoolYear, graduated } = req.query;
  let query = {};

  if (fullName) {
    query.fullName = { $regex: fullName, $options: "i" };
  }

  if (unit) {
    query.unit = unit;
  }

  if (enrollment) {
    query.enrollment = parseInt(enrollment);
  }

  // Filter theo năm học
  if (schoolYear) {
    const startYear = parseInt(schoolYear.split("-")[0]);

    // Vào trước/đúng startYear và (chưa ra trường hoặc ra trường sau 31/12/startYear)
    query.$and = [
      { enrollment: { $lte: startYear } },
      {
        $or: [
          { graduationDate: { $exists: false } },
          { graduationDate: null },
          { graduationDate: { $gt: new Date(startYear, 11, 31) } },
        ],
      },
    ];
  } else {
    // Filter theo trạng thái ra trường (chỉ khi không có schoolYear)
    if (graduated === "false") {
      // Chỉ lấy sinh viên chưa ra trường (graduationDate không tồn tại hoặc null)
      query.$and = [
        {
          $or: [
            { graduationDate: { $exists: false } },
            { graduationDate: null },
          ],
        },
      ];
    } else if (graduated === "true") {
      // Chỉ lấy sinh viên đã ra trường
      query.graduationDate = { $exists: true, $ne: null };
    }
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
      ethnicity,
      religion,
      currentAddress,
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
        ethnicity,
        religion,
        currentAddress,
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
      studentId,
      fullName: fullName ? fullName : req.body.username,
      gender,
      birthday,
      hometown,
      currentAddress,
      email,
      phoneNumber,
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
          schoolYear: tuitionFee.schoolYear,
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
      if (
        student.learningInformation &&
        student.learningInformation.length > 0
      ) {
        student.learningInformation.forEach((info) => {
          if (info && info.semester) {
            allSemesters.push(info.semester);
          }
        });
      }
    });

    // Kiểm tra nếu không có học kỳ nào
    if (allSemesters.length === 0) {
      return res.status(200).json({
        learningResults: 0,
        studentOweSubjects: 0,
        latestSemester: null,
      });
    }

    // Lọc ra học kỳ lớn nhất từ mảng
    const maxSemester = allSemesters.reduce((max, current) => {
      // Chuyển đổi HK1, HK2, HK3 thành số để so sánh
      const maxNum = parseInt(max.replace("HK", ""));
      const currentNum = parseInt(current.replace("HK", ""));
      return maxNum > currentNum ? max : current;
    });

    students.forEach((student) => {
      if (
        student.learningInformation &&
        student.learningInformation.length > 0
      ) {
        student.learningInformation.forEach((learningInformation) => {
          if (
            learningInformation &&
            learningInformation.semester === maxSemester
          ) {
            if (learningInformation.CPA >= 2.5) learningResults++;
            if (learningInformation.totalDebt) studentOweSubjects++;
          }
        });
      }
    });

    return res.status(200).json({
      learningResults,
      studentOweSubjects,
      latestSemester: maxSemester,
    });
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
    const { unit } = req.query;
    console.log("=== getListSuggestedReward START ===", { unit });
    const students = await Student.find().populate({
      path: "university",
      select: "universityName",
    });
    console.log("Students found:", students.length);

    // 1) Cố gắng dựa theo NĂM HỌC (yearlyResults) nếu không có learningInformation
    const allSchoolYears = [];
    students.forEach((student) => {
      (student.yearlyResults || []).forEach((yr) => {
        if (yr && yr.schoolYear) allSchoolYears.push(yr.schoolYear);
      });
    });

    let latestSchoolYear = null;
    if (allSchoolYears.length > 0) {
      latestSchoolYear = allSchoolYears.reduce((latest, current) => {
        const getStartYear = (sy) => {
          const m = String(sy).match(/^(\d{4})/);
          return m ? parseInt(m[1], 10) : 0;
        };
        return getStartYear(current) > getStartYear(latest) ? current : latest;
      }, allSchoolYears[0]);
      console.log("latestSchoolYear:", latestSchoolYear);
    }

    let suggestedRewards = [];
    let labelForHeader = "";

    if (latestSchoolYear) {
      // Ưu tiên theo năm học: chọn GPA năm (averageGrade4)
      labelForHeader = latestSchoolYear;
      students.forEach((student) => {
        const yr = (student.yearlyResults || []).find(
          (y) => y && y.schoolYear === latestSchoolYear
        );
        if (!yr) return;

        const currentGPA =
          typeof yr.averageGrade4 === "number" ? yr.averageGrade4 : 0;
        if (currentGPA < 2.995) return; // Ngưỡng xét khen thưởng

        // Xác định rèn luyện trong năm: dựa vào physicalResult.semester có chứa năm bắt đầu hoặc năm kết thúc
        const startYear = parseInt(latestSchoolYear.slice(0, 4), 10);
        const endYear = parseInt(latestSchoolYear.slice(-4), 10);
        let practise = "";
        (student.physicalResult || []).forEach((pr) => {
          const sem = String(pr.semester || "");
          // Hỗ trợ cả dạng "2024.1" hoặc chứa năm bất kỳ
          const semYear = parseInt(sem, 10);
          if (
            (!isNaN(semYear) &&
              (semYear === startYear || semYear === endYear)) ||
            sem.includes(String(startYear)) ||
            sem.includes(String(endYear))
          ) {
            if (
              pr.practise &&
              (!practise || pr.practise === "Tốt" || pr.practise === "Xuất sắc")
            ) {
              practise = pr.practise;
            }
          }
        });

        // Nếu không bắt được rèn luyện theo năm, chấp nhận rèn luyện tốt/XS bất kỳ
        if (!practise) {
          const anyGood = (student.physicalResult || []).some(
            (pr) => pr.practise === "Tốt" || pr.practise === "Xuất sắc"
          );
          practise = anyGood ? "Tốt" : "";
        }

        // Chỉ thêm khi có hoặc không bắt buộc rèn luyện? Giữ điều kiện mềm: nếu không có thông tin rèn luyện thì vẫn thêm
        suggestedRewards.push({
          fullName: student.fullName,
          unit: student.unit,
          university: student.university?.universityName || "",
          GPA: currentGPA,
          practise,
        });
      });
    } else {
      // 2) Fallback theo HỌC KỲ cũ nếu không có yearlyResults
      console.warn(
        "No yearlyResults found. Falling back to learningInformation.semester"
      );
      // Tạo một mảng chứa tất cả các học kỳ
      let allSemesters = [];
      students.forEach((student) => {
        (student.learningInformation || []).forEach((info) => {
          if (info && info.semester) allSemesters.push(info.semester);
        });
      });

      // Lọc ra học kỳ lớn nhất từ mảng
      const maxSemester = allSemesters.reduce((max, current) => {
        return max > current ? max : current;
      }, "");

      if (!maxSemester) {
        console.warn(
          "No semesters found in learningInformation (fallback mode)"
        );
        return res
          .status(404)
          .json({ message: "Không tìm thấy học kỳ/năm nào." });
      }
      labelForHeader = maxSemester;
      console.log("maxSemester (fallback):", maxSemester);

      // Danh sách học viên đạt yêu cầu theo học kỳ
      students.forEach((student) => {
        let meetsCriteria = false;
        let currentGPA = 0;

        (student.learningInformation || []).forEach((learningInformation) => {
          if (
            learningInformation.semester === maxSemester &&
            learningInformation.GPA >= 2.995
          ) {
            meetsCriteria = true;
            currentGPA = learningInformation.GPA;
          }
        });

        (student.physicalResult || []).forEach((physicalResult) => {
          if (physicalResult.semester === maxSemester) {
            const { practise } = physicalResult;
            if (practise === "Tốt" || practise === "Xuất sắc") {
              if (meetsCriteria) {
                suggestedRewards.push({
                  fullName: student.fullName,
                  unit: student.unit,
                  university: student.university?.universityName || "",
                  GPA: currentGPA,
                  practise: practise,
                });
              }
            }
          }
        });
      });
    }

    // Lọc theo đơn vị nếu truyền vào
    if (unit) {
      suggestedRewards = suggestedRewards.filter(
        (s) => String(s.unit) === String(unit)
      );
    }

    // Sắp xếp từ cao xuống thấp theo GPA, tie-break theo rèn luyện (Xuất sắc > Tốt > Khá > ...)
    const practiseRank = (p) =>
      p === "Xuất sắc" ? 3 : p === "Tốt" ? 2 : p === "Khá" ? 1 : 0;
    suggestedRewards.sort((a, b) => {
      if (b.GPA !== a.GPA) return b.GPA - a.GPA;
      return practiseRank(b.practise) - practiseRank(a.practise);
    });

    console.log(
      "Suggested count (after filter/sort):",
      suggestedRewards.length
    );
    console.log("=== getListSuggestedReward END ===");
    console.log(
      "Suggested count (after filter/sort):",
      suggestedRewards.length
    );
    console.log("=== getListSuggestedReward END ===");
    // Trả về labelForHeader (nếu là năm học sẽ là chuỗi năm) để FE hiển thị
    return res
      .status(200)
      .json({ suggestedRewards, maxSemester: labelForHeader });
  } catch (error) {
    console.error("Error in getListSuggestedReward:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: String(error?.message || error) });
  }
};

// Top sinh viên theo lớp dựa trên HỌC KỲ mới nhất (learningInformation.semester)
const getTopStudentsByLatestSemester = async (req, res) => {
  try {
    const students = await Student.find()
      .populate({ path: "class", select: "className" })
      .select("fullName class learningInformation");

    // Thu thập tất cả các học kỳ hiện có
    const allSemesters = [];
    students.forEach((student) => {
      (student.learningInformation || []).forEach((li) => {
        if (li && li.semester) allSemesters.push(li.semester);
      });
    });

    if (allSemesters.length === 0) {
      return res.status(200).json({ semester: null, topStudents: [] });
    }

    // Chọn học kỳ lớn nhất theo quy ước hiện tại trong hệ thống (giống các API đang dùng)
    const latestSemester = allSemesters.reduce((max, current) => {
      return max > current ? max : current;
    }, allSemesters[0]);

    // Chọn top theo từng lớp: GPA cao nhất trong latestSemester
    const classIdToTop = new Map();
    students.forEach((student) => {
      const entry = (student.learningInformation || []).find(
        (li) => li && li.semester === latestSemester
      );
      if (!entry || typeof entry.GPA !== "number") return;

      const classId = student.class?._id?.toString() || "unknown";
      const className = student.class?.className || "Chưa có lớp";
      const existing = classIdToTop.get(classId);
      if (!existing || entry.GPA > existing.GPA) {
        classIdToTop.set(classId, {
          studentId: student._id,
          fullName: student.fullName,
          classId,
          className,
          GPA: entry.GPA,
          semester: latestSemester,
        });
      }
    });

    const topStudents = Array.from(classIdToTop.values()).sort(
      (a, b) => b.GPA - a.GPA
    );

    return res.status(200).json({ semester: latestSemester, topStudents });
  } catch (error) {
    console.error("Error in getTopStudentsByLatestSemester:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Top sinh viên theo lớp dựa trên NĂM HỌC mới nhất (yearlyResults)
const getTopStudentsByLatestYear = async (req, res) => {
  try {
    // Lấy toàn bộ học viên kèm thông tin lớp và yearlyResults
    const students = await Student.find()
      .populate({ path: "class", select: "className" })
      .select("fullName class unit yearlyResults");

    // Tập hợp tất cả schoolYear từ yearlyResults để tìm năm học mới nhất
    const allSchoolYears = [];
    students.forEach((student) => {
      (student.yearlyResults || []).forEach((yr) => {
        if (yr && yr.schoolYear) allSchoolYears.push(yr.schoolYear);
      });
    });

    if (allSchoolYears.length === 0) {
      return res.status(200).json({ schoolYear: null, topStudents: [] });
    }

    // Chọn schoolYear mới nhất dựa theo năm bắt đầu (VD: "2023-2024" -> 2023)
    const latestSchoolYear = allSchoolYears.reduce((latest, current) => {
      const getStartYear = (sy) => {
        const m = String(sy).match(/^(\d{4})/);
        return m ? parseInt(m[1], 10) : 0;
      };
      return getStartYear(current) > getStartYear(latest) ? current : latest;
    }, allSchoolYears[0]);

    // Cho phép client yêu cầu schoolYear cụ thể qua query
    const requestedSchoolYear = req.query.schoolYear;
    const chosenSchoolYear = requestedSchoolYear || latestSchoolYear;

    // Chọn top theo từng lớp (cao nhất averageGrade4 trong latestSchoolYear)
    const classIdToTop = new Map();

    students.forEach((student) => {
      const yr = (student.yearlyResults || []).find(
        (y) => y && y.schoolYear === chosenSchoolYear
      );
      if (!yr) return;

      const avg4 = typeof yr.averageGrade4 === "number" ? yr.averageGrade4 : 0;
      const avg10 =
        typeof yr.averageGrade10 === "number" ? yr.averageGrade10 : 0;
      const classId = student.class?._id?.toString() || "unknown";
      const className = student.class?.className || "Chưa có lớp";

      const existing = classIdToTop.get(classId);
      if (!existing || avg4 > existing.averageGrade4) {
        classIdToTop.set(classId, {
          studentId: student._id,
          fullName: student.fullName,
          classId,
          className,
          unit: student.unit || "",
          averageGrade4: avg4,
          averageGrade10: avg10,
          schoolYear: chosenSchoolYear,
          trainingRating: yr.trainingRating || null,
        });
      }
    });

    // Kết quả cuối: sắp xếp giảm dần theo averageGrade4
    const topStudents = Array.from(classIdToTop.values()).sort(
      (a, b) => b.averageGrade4 - a.averageGrade4
    );

    return res.status(200).json({ schoolYear: chosenSchoolYear, topStudents });
  } catch (error) {
    console.error("Error in getTopStudentsByLatestYear:", error);
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
  const unitQuery = req.query.unit;

  let students = await Student.find({});

  // Lọc theo đơn vị nếu có
  if (unitQuery && unitQuery !== "all") {
    const unitArray = unitQuery.split(",");
    students = students.filter((student) => unitArray.includes(student.unit));
  }

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

  // Sắp xếp theo thứ tự từ L1 đến L6
  cutRices.sort((a, b) => {
    const unitOrder = {
      "L1 - H5": 1,
      "L2 - H5": 2,
      "L3 - H5": 3,
      "L4 - H5": 4,
      "L5 - H5": 5,
      "L6 - H5": 6,
    };
    return (unitOrder[a.unit] || 999) - (unitOrder[b.unit] || 999);
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
  worksheet.getCell("A10").value = "Đơn vị";
  worksheet.getCell("A10").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("A10").font = { name: "Times New Roman", size: 13 };

  worksheet.mergeCells("B10:B11");
  worksheet.getCell("B10").value = "Họ và tên";
  worksheet.getCell("B10").alignment = {
    vertical: "middle",
    horizontal: "center",
  };
  worksheet.getCell("B10").font = { name: "Times New Roman", size: 13 };

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
    worksheet.mergeCells(10, i * 3 + 3, 10, i * 3 + 5);
    worksheet.getCell(10, i * 3 + 3).value = day;
    worksheet.getCell(10, i * 3 + 3).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell(10, i * 3 + 3).font = {
      name: "Times New Roman",
      size: 13,
    };

    meals.forEach((meal, j) => {
      worksheet.getCell(11, i * 3 + 3 + j).value = meal;
      worksheet.getCell(11, i * 3 + 3 + j).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell(11, i * 3 + 3 + j).font = {
        name: "Times New Roman",
        size: 13,
      };
    });
  });

  // Thêm dữ liệu với logic gộp cột đơn vị
  let currentUnit = "";
  let unitStartRow = 12; // Bắt đầu từ hàng 12 (sau header)

  cutRices.forEach((record, index) => {
    const row = [
      record.unit, // Cột đơn vị
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
    const currentRow = 12 + index; // Hàng hiện tại

    // Logic gộp cột đơn vị
    if (record.unit !== currentUnit) {
      // Nếu đơn vị thay đổi và có đơn vị trước đó, gộp các ô
      if (currentUnit !== "" && currentRow > unitStartRow) {
        worksheet.mergeCells(`A${unitStartRow}:A${currentRow - 1}`);
        worksheet.getCell(`A${unitStartRow}`).alignment = {
          vertical: "middle",
          horizontal: "center",
        };
      }
      currentUnit = record.unit;
      unitStartRow = currentRow;
    }

    addedRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Times New Roman", size: 13 };
      // Căn giữa cho tất cả các ô dữ liệu
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });
  });

  // Gộp ô cho đơn vị cuối cùng
  if (currentUnit !== "" && cutRices.length > 0) {
    const lastRow = 12 + cutRices.length - 1;
    if (lastRow >= unitStartRow) {
      worksheet.mergeCells(`A${unitStartRow}:A${lastRow}`);
      worksheet.getCell(`A${unitStartRow}`).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }
  }

  // Định nghĩa border cho tất cả các ô trong bảng
  const totalColumns = 25; // Số cột từ 'Đơn vị' tới 'Chủ nhật' (tăng 1 do thêm cột đơn vị)
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
    "attachment; filename=Danh_sach_cat_com_he_hoc_vien_5.xlsx"
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
        "Trường Đại học",
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
    const schoolYearQuery = req.query.schoolYear;
    const unitQuery = req.query.unit; // Giữ nguyên endpoint nhưng đổi tên biến

    // Populate university và class để lấy thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
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
          schoolYear: tuitionFee.schoolYear,
          content: tuitionFee.content,
          status: tuitionFee.status,
        });
      });
    });

    if (tuitionFees.length > 0) {
      const uniqueSemesters = [
        ...new Set(tuitionFees.map((tf) => tf.semester)),
      ];
      const uniqueSchoolYears = [
        ...new Set(tuitionFees.map((tf) => tf.schoolYear)),
      ];
      const uniqueClasses = [...new Set(tuitionFees.map((tf) => tf.className))];
      const uniqueUnits = [...new Set(tuitionFees.map((tf) => tf.unit))];
    }

    // Lọc theo học kỳ
    if (semesterQuery && semesterQuery !== "all") {
      const semesterArray = semesterQuery.split(",");
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return semesterArray.includes(tuitionFee.semester);
      });
    }

    // Lọc theo năm học
    if (schoolYearQuery && schoolYearQuery !== "all") {
      const schoolYearArray = schoolYearQuery.split(",");
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return schoolYearArray.includes(tuitionFee.schoolYear);
      });
    }

    // Lọc theo đơn vị
    if (unitQuery && unitQuery !== "all") {
      const unitArray = unitQuery.split(",");

      tuitionFees = tuitionFees.filter((tuitionFee) => {
        // Kiểm tra cả className và unit với tên đơn vị được gửi trực tiếp
        const isIncluded = unitArray.some(
          (unitName) =>
            tuitionFee.className === unitName ||
            tuitionFee.unit === unitName ||
            tuitionFee.className.includes(unitName) ||
            tuitionFee.unit.includes(unitName)
        );

        if (!isIncluded) {
          console.log(tuitionFee.unit);
        }

        return isIncluded;
      });
    }

    // Sắp xếp theo thứ tự từ L1 đến L6
    tuitionFees.sort((a, b) => {
      const unitOrder = {
        "L1 - H5": 1,
        "L2 - H5": 2,
        "L3 - H5": 3,
        "L4 - H5": 4,
        "L5 - H5": 5,
        "L6 - H5": 6,
      };

      const aOrder = unitOrder[a.unit] || 999;
      const bOrder = unitOrder[b.unit] || 999;

      return aOrder - bOrder;
    });

    // Tính tổng học phí và phân loại theo trạng thái
    const totalAmountSum = tuitionFees.reduce((sum, tuitionFee) => {
      return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
    }, 0);

    const paidAmountSum = tuitionFees
      .filter((tuitionFee) => tuitionFee.status === "Đã thanh toán")
      .reduce((sum, tuitionFee) => {
        return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
      }, 0);

    const unpaidAmountSum = tuitionFees
      .filter((tuitionFee) => tuitionFee.status === "Chưa thanh toán")
      .reduce((sum, tuitionFee) => {
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

      // Tạo tên file động dựa trên các tham số
      let fileName = "Thong_ke_hoc_phi_he_hoc_vien_5";

      // Thêm thông tin học kỳ
      if (semesterQuery && semesterQuery !== "all") {
        const semesterArray = semesterQuery.split(",");
        fileName += `_${semesterArray.join("_")}`;
      } else {
        fileName += "_tat_ca_hoc_ky";
      }

      // Thêm thông tin năm học
      if (schoolYearQuery && schoolYearQuery !== "all") {
        const schoolYearArray = schoolYearQuery.split(",");
        // Loại bỏ các năm học trùng lặp
        const uniqueSchoolYears = [...new Set(schoolYearArray)];
        fileName += `_${uniqueSchoolYears.join("_")}`;
      } else {
        fileName += "_tat_ca_nam_hoc";
      }

      // Thêm thông tin đơn vị
      if (unitQuery && unitQuery !== "all") {
        const unitArray = unitQuery.split(",");
        fileName += `_${unitArray.join("_")}`;
      } else {
        fileName += "_tat_ca_don_vi";
      }

      fileName += ".pdf";

      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=${fileName}`,
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

    const tableHeaderWidths = [70, 90, 85, 130, 60, 60];
    const totalTableWidth = tableHeaderWidths.reduce((a, b) => a + b, 0);
    const pageWidth = doc.page.width;
    const tableStartX = (pageWidth - totalTableWidth) / 2;

    // Add initial header
    const addHeader = () => {
      doc
        .font("Roboto-Bold")
        .fontSize(13)
        .text("HỌC VIỆN KHOA HỌC QUÂN SỰ", {
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
        .text(" HỆ HỌC VIÊN 5", 150, 90, {
          align: "left",
          continued: true,
        })
        .text("Độc lập - Tự do - Hạnh phúc", 260, 90, {
          align: "left",
        });

      doc.moveDown(1);

      // Lấy ngày tháng năm hiện tại
      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1; // getMonth() trả về 0-11
      const year = now.getFullYear();

      doc
        .font("Roboto-LightItalic")
        .fontSize(13)
        .text(`Hà Nội, ngày ${day} tháng ${month} năm ${year}`, {
          align: "right",
        });

      doc.moveDown(2);
      doc.font("Roboto-Bold").fontSize(15).text("BÁO CÁO", 50, doc.y, {
        align: "center",
      });

      doc.moveDown(0.5);

      // Tạo tiêu đề phù hợp
      let title = "Thống kê học phí";
      let titleParts = [];

      // Xử lý học kỳ và năm học thông minh
      if (
        semesterQuery &&
        semesterQuery !== "all" &&
        schoolYearQuery &&
        schoolYearQuery !== "all"
      ) {
        const semesterArray = semesterQuery.split(",");
        const schoolYearArray = schoolYearQuery.split(",");

        // Kiểm tra xem có cùng năm học không
        const uniqueSchoolYears = [...new Set(schoolYearArray)];

        if (uniqueSchoolYears.length === 1) {
          // Cùng năm học: "HK1,2 năm học 2024-2025"
          titleParts.push(
            `học kỳ ${semesterArray.join(",")} năm học ${uniqueSchoolYears[0]}`
          );
        } else {
          // Khác năm học: "HK1 năm học 2024-2025, HK2 năm học 2025-2026"
          const combined = semesterArray.map(
            (semester, index) => `${semester} năm học ${schoolYearArray[index]}`
          );
          titleParts.push(`học kỳ ${combined.join(", ")}`);
        }
      } else {
        // Xử lý riêng lẻ nếu chỉ có học kỳ hoặc chỉ có năm học
        if (semesterQuery && semesterQuery !== "all") {
          titleParts.push(`học kỳ ${semesterQuery}`);
        }
        if (schoolYearQuery && schoolYearQuery !== "all") {
          titleParts.push(`năm học ${schoolYearQuery}`);
        }
      }

      if (unitQuery && unitQuery !== "all") {
        // Xử lý tên đơn vị trực tiếp cho tiêu đề
        const unitArray = unitQuery.split(",");
        titleParts.push(`đơn vị ${unitArray.join(", ")}`);
      }

      if (titleParts.length > 0) {
        title += ` ${titleParts.join(", ")}`;
      }

      // Kiểm tra độ dài tiêu đề để điều chỉnh font size
      const titleLength = title.length;
      let fontSize = 13;
      if (titleLength > 80) {
        fontSize = 11;
      } else if (titleLength > 60) {
        fontSize = 12;
      }

      doc.font("Roboto-Bold").fontSize(fontSize).text(title, 50, doc.y, {
        align: "center",
      });

      doc.moveDown(1.5);
      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text(
          "1. Tổng số tiền học phí: " +
            totalAmountSum.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            }),
          50,
          doc.y,
          {
            align: "left",
          }
        );

      doc.moveDown(0.5);
      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text(
          "2. Cần thanh toán: " +
            unpaidAmountSum.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            }),
          50,
          doc.y,
          {
            align: "left",
          }
        );

      doc.moveDown(0.5);
      doc
        .font("Roboto-Bold")
        .fontSize(12)
        .text(
          "3. Đã thanh toán: " +
            paidAmountSum.toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            }),
          50,
          doc.y,
          {
            align: "left",
          }
        );

      // Table Headers
      doc.moveDown(0.5);
      const tableTop = doc.y; // Define tableTop here

      const tableHeaders = [
        "Đơn vị",
        "Họ và tên",
        "Trường Đại học",
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

      // Function format số tiền với dấu phẩy ngăn cách hàng nghìn
      const formatCurrency = (amount) => {
        if (!amount) return "";
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      };

      results.slice(startIndex, startIndex + 16).forEach((result) => {
        const row = [
          result.unit || "",
          result.fullName,
          (result.university || "").replace("Đại học ", "").trim(),
          (result.content || "")
            .replace("Tổng ", "")
            .replace("học kỳ", "HK")
            .replace("học phí", "HP"),
          formatCurrency(result.totalAmount) || "",
          result.status || "",
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
        .text("Bùi Đình Thế", signatureX, doc.y, { align: "center" });
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
      graduationDate,
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
      graduationDate,
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
          const subjects = Array.isArray(result.subjects)
            ? result.subjects
            : [];
          const normalizedSubjects = subjects.map((s) => {
            let letter = s.letterGrade;
            if (!letter) {
              if (typeof s.gradePoint10 === "number") {
                letter = gradeHelper.grade10ToLetter(s.gradePoint10);
              } else if (typeof s.gradePoint4 === "number") {
                letter = gradeHelper.grade4ToLetter(s.gradePoint4);
              }
            }
            const gradePoint4 = gradeHelper.letterToGrade4(letter);
            const gradePoint10 = gradeHelper.letterToGrade10(letter);
            return {
              ...(s.toObject?.() || s),
              letterGrade: letter,
              gradePoint4,
              gradePoint10,
            };
          });

          const failedSubjects =
            gradeHelper.calculateFailedSubjects(normalizedSubjects);
          const debtCredits =
            gradeHelper.calculateDebtCredits(normalizedSubjects);

          const learningResult = {
            _id: result._id,
            studentId: student._id,
            fullName: student.fullName,
            studentCode: student.studentId,
            university: student.university?.universityName || "",
            className: student.class?.className || "",
            unit: student.unit || "",
            positionParty: student.positionParty || "Không",
            semester: result.semester,
            schoolYear: result.schoolYear,
            yearlyResults: student.yearlyResults || [],
            GPA: result.averageGrade4?.toFixed(2) || "0.00",
            CPA: result.cumulativeGrade4?.toFixed(2) || "0.00",
            cumulativeCredit: result.cumulativeCredits || 0,
            totalDebt: result.totalDebt || 0,
            studentLevel: result.studentLevel || 1,
            warningLevel: result.warningLevel || 0,
            subjects: normalizedSubjects,
            totalCredits: result.totalCredits || 0,
            averageGrade10: result.averageGrade10?.toFixed(2) || "0.00",
            cumulativeGrade10FromCpa4: (() => {
              const cpa4 = parseFloat(result.cumulativeGrade4) || 0;
              if (cpa4 < 2.0) return "0.00";
              if (cpa4 < 2.5)
                return Math.min(10.0, 3.0 * cpa4 - 0.5).toFixed(2);
              if (cpa4 < 3.2)
                return Math.min(10.0, 1.42 * cpa4 + 3.45).toFixed(2);
              return Math.min(10.0, 2.5 * cpa4 + 0.0).toFixed(2);
            })(),
            // Thêm lại các trường nợ đảm bảo đúng
            debtCredits,
            failedSubjects,
            // Thêm thông tin xếp loại từ semesterResults
            semesterResults: [
              {
                ...(result.toObject?.() || result),
                subjects: normalizedSubjects,
                debtCredits,
                failedSubjects,
              },
            ],
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

const getPdfCutRice = async (req, res) => {
  try {
    const unitQuery = req.query.unit;

    let students = await Student.find({}).populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    // Lấy dữ liệu lịch học từ API
    const TimeTable = require("../models/time_table");
    let timeTables = await TimeTable.find({}).populate("studentId");

    // Tạo map để lưu lịch học theo học viên
    const timeTableMap = new Map();

    timeTables.forEach((timeTable) => {
      if (
        timeTable.studentId &&
        timeTable.schedules &&
        timeTable.schedules.length > 0
      ) {
        const studentId = timeTable.studentId._id.toString();
        if (!timeTableMap.has(studentId)) {
          timeTableMap.set(studentId, {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          });
        }

        const studentSchedule = timeTableMap.get(studentId);
        timeTable.schedules.forEach((schedule) => {
          const dayKey = schedule.day.toLowerCase();
          if (studentSchedule[dayKey]) {
            studentSchedule[dayKey].push({
              subject: schedule.subject,
              time: schedule.time,
              classroom: schedule.classroom,
              schoolWeek: schedule.schoolWeek,
            });
          }
        });
      }
    });

    // Lọc theo đơn vị nếu có
    if (unitQuery && unitQuery !== "all") {
      const unitArray = unitQuery.split(",");
      students = students.filter((student) => unitArray.includes(student.unit));
    }

    // Sắp xếp theo thứ tự từ L1 đến L6
    students.sort((a, b) => {
      const unitOrder = {
        "L1 - H5": 1,
        "L2 - H5": 2,
        "L3 - H5": 3,
        "L4 - H5": 4,
        "L5 - H5": 5,
        "L6 - H5": 6,
      };
      return (unitOrder[a.unit] || 999) - (unitOrder[b.unit] || 999);
    });

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape", // Khổ ngang
      margins: {
        top: 2 * 28.35,
        left: 2 * 28.35,
        right: 2 * 28.35,
        bottom: 2 * 28.35,
      },
    });

    let buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      let pdfData = Buffer.concat(buffers);

      // Tạo tên file động
      let fileName = "Lich_cat_com_va_lich_hoc_he_hoc_vien_5";
      if (unitQuery && unitQuery !== "all") {
        const unitArray = unitQuery.split(",");
        fileName += `_${unitArray.join("_")}`;
      } else {
        fileName += "_tat_ca_don_vi";
      }
      fileName += ".pdf";

      res
        .writeHead(200, {
          "Content-Length": Buffer.byteLength(pdfData),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment;filename=${fileName}`,
        })
        .end(pdfData);
    });

    // Đăng ký font
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

    // Header
    doc.font("Roboto-Bold").fontSize(14).text("HỌC VIỆN KHOA HỌC QUÂN SỰ", {
      align: "center",
    });

    doc.moveDown(0.5);
    doc.font("Roboto-Bold").fontSize(14).text("HỆ HỌC VIÊN 5", {
      align: "center",
    });

    doc.moveDown(0.5);
    doc.font("Roboto-Bold").fontSize(16).text("LỊCH CẮT CƠM VÀ LỊCH HỌC", {
      align: "center",
    });

    // Ngày tháng
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    doc.moveDown(0.5);
    doc
      .font("Roboto-LightItalic")
      .fontSize(12)
      .text(`Hà Nội, ngày ${day} tháng ${month} năm ${year}`, {
        align: "right",
      });

    doc.moveDown(1);

    // Định nghĩa cột cho bảng
    const tableHeaders = [
      "Đơn vị",
      "STT",
      "Họ tên",
      "Thứ",
      "Lịch học",
      "Cắt cơm",
    ];

    const columnWidths = [60, 30, 120, 40, 80, 90];
    const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
    const startX = (doc.page.width - totalWidth) / 2;

    // Vẽ header bảng với sub-headers
    let currentX = startX;
    const headerY = doc.y;
    doc.font("Roboto-Bold").fontSize(8);

    // Vẽ border header chính
    doc.rect(startX, headerY, totalWidth, 40).stroke();

    // Vẽ header chính
    tableHeaders.forEach((header, i) => {
      doc.text(header, currentX, headerY + 5, {
        width: columnWidths[i],
        align: "center",
      });

      // Vẽ đường kẻ dọc cho header
      if (i > 0) {
        doc
          .moveTo(currentX, headerY)
          .lineTo(currentX, headerY + 40)
          .stroke();
      }
      currentX += columnWidths[i];
    });

    // Vẽ sub-headers cho Lịch học và Cắt cơm
    currentX = startX;

    // Đơn vị, STT, Họ tên, Thứ - không có sub-header
    currentX +=
      columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3];

    // Sub-header cho Lịch học
    const lichHocX = currentX;
    doc.text("môn", lichHocX, headerY + 25, {
      width: columnWidths[4] / 2,
      align: "center",
    });
    doc.text("t.gian học", lichHocX + columnWidths[4] / 2, headerY + 25, {
      width: columnWidths[4] / 2,
      align: "center",
    });

    // Vẽ đường kẻ dọc giữa sub-headers
    doc
      .moveTo(lichHocX + columnWidths[4] / 2, headerY + 20)
      .lineTo(lichHocX + columnWidths[4] / 2, headerY + 40)
      .stroke();

    currentX += columnWidths[4];

    // Sub-header cho Cắt cơm
    const catComX = currentX;
    doc.text("sáng", catComX, headerY + 25, {
      width: columnWidths[5] / 3,
      align: "center",
    });
    doc.text("trưa", catComX + columnWidths[5] / 3, headerY + 25, {
      width: columnWidths[5] / 3,
      align: "center",
    });
    doc.text("Tối", catComX + (2 * columnWidths[5]) / 3, headerY + 25, {
      width: columnWidths[5] / 3,
      align: "center",
    });

    // Vẽ đường kẻ dọc giữa sub-headers
    doc
      .moveTo(catComX + columnWidths[5] / 3, headerY + 20)
      .lineTo(catComX + columnWidths[5] / 3, headerY + 40)
      .stroke();
    doc
      .moveTo(catComX + (2 * columnWidths[5]) / 3, headerY + 20)
      .lineTo(catComX + (2 * columnWidths[5]) / 3, headerY + 40)
      .stroke();

    // Không moveDown để header liền với bảng
    const dataStartY = headerY + 40;

    // Vẽ dữ liệu
    let currentUnit = "";
    let unitStartRow = 0;
    let rowCount = 0;
    const rowHeight = 20;

    // Tạo dữ liệu cho từng học viên với mỗi thứ ở dòng riêng
    const allRows = [];
    let dataCurrentUnit = "";
    let unitStudentIndex = 0;

    students.forEach((student, studentIndex) => {
      const studentTimeTable = timeTableMap.get(student._id.toString()) || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };

      const dayKeys = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const dayNumbers = ["2", "3", "4", "5", "6", "7", "CN"];

      // Reset STT khi đơn vị thay đổi
      if (student.unit !== dataCurrentUnit) {
        dataCurrentUnit = student.unit;
        unitStudentIndex = 0;
      }
      unitStudentIndex++;

      // Tạo một dòng cho mỗi thứ có lịch học hoặc cắt cơm
      dayKeys.forEach((dayKey, dayIndex) => {
        const daySchedule = studentTimeTable[dayKey] || [];
        const dayData = student.cutRice[0]?.[dayKey] || {};

        // Chỉ tạo dòng nếu có lịch học hoặc cắt cơm
        if (
          daySchedule.length > 0 ||
          dayData.breakfast ||
          dayData.lunch ||
          dayData.dinner
        ) {
          allRows.push({
            student,
            studentIndex: unitStudentIndex, // Sử dụng STT trong đơn vị
            dayKey,
            dayNumber: dayNumbers[dayIndex],
            daySchedule,
            dayData,
            isFirstRow:
              allRows.length === 0 ||
              allRows[allRows.length - 1].student._id.toString() !==
                student._id.toString(),
          });
        }
      });
    });

    // Vẽ từng dòng
    allRows.forEach((rowData, rowIndex) => {
      const {
        student,
        studentIndex,
        dayKey,
        dayNumber,
        daySchedule,
        dayData,
        isFirstRow,
      } = rowData;

      currentX = startX;
      const currentRowY = dataStartY + rowCount * rowHeight;
      doc.font("Roboto-Regular").fontSize(7);

      // Đơn vị - chỉ hiển thị ở dòng đầu tiên của học viên
      if (isFirstRow) {
        doc.text(student.unit, currentX, currentRowY + 5, {
          width: columnWidths[0],
          align: "center",
        });
      }
      currentX += columnWidths[0];

      // STT - chỉ hiển thị ở dòng đầu tiên của học viên
      if (isFirstRow) {
        doc.text((studentIndex + 1).toString(), currentX, currentRowY + 5, {
          width: columnWidths[1],
          align: "center",
        });
      }
      currentX += columnWidths[1];

      // Họ tên - chỉ hiển thị ở dòng đầu tiên của học viên
      if (isFirstRow) {
        const universityName = student.university?.universityName || "";
        const major = student.major || "";
        const travelTime = student.organization?.travelTime || "";

        let fullNameContent = `${
          student.fullName
        }\nTrường: ${universityName.replace(
          "Đại học ",
          ""
        )}\nNgành: ${major}\nThời gian di chuyển: ${travelTime}`;

        doc.text(fullNameContent, currentX, currentRowY + 5, {
          width: columnWidths[2],
          align: "left",
        });
      }
      currentX += columnWidths[2];

      // Thứ - hiển thị số thứ tự ngày
      doc.text(dayNumber, currentX, currentRowY + 5, {
        width: columnWidths[3],
        align: "center",
      });
      currentX += columnWidths[3];

      // Lịch học (môn và thời gian)
      let subjectContent = "";
      let timeContent = "";

      daySchedule.forEach((schedule, subIndex) => {
        if (subjectContent) subjectContent += "\n";
        if (timeContent) timeContent += "\n";
        subjectContent += schedule.subject;
        timeContent += schedule.time;
      });

      // Vẽ môn học
      doc.text(subjectContent, currentX, currentRowY + 5, {
        width: columnWidths[4] / 2,
        align: "center",
      });

      // Vẽ thời gian học
      doc.text(timeContent, currentX + columnWidths[4] / 2, currentRowY + 5, {
        width: columnWidths[4] / 2,
        align: "center",
      });
      currentX += columnWidths[4];

      // Cắt cơm (sáng, trưa, tối)
      let sangContent = dayData.breakfast ? "X" : "";
      let truaContent = dayData.lunch ? "X" : "";
      let toiContent = dayData.dinner ? "X" : "";

      // Vẽ sáng
      doc.text(sangContent, currentX, currentRowY + 5, {
        width: columnWidths[5] / 3,
        align: "center",
      });

      // Vẽ trưa
      doc.text(truaContent, currentX + columnWidths[5] / 3, currentRowY + 5, {
        width: columnWidths[5] / 3,
        align: "center",
      });

      // Vẽ tối
      doc.text(
        toiContent,
        currentX + (2 * columnWidths[5]) / 3,
        currentRowY + 5,
        {
          width: columnWidths[5] / 3,
          align: "center",
        }
      );
      currentX += columnWidths[5];

      // Vẽ border cho từng hàng
      doc.rect(startX, currentRowY, totalWidth, rowHeight).stroke();

      // Vẽ đường kẻ dọc cho từng hàng
      currentX = startX;
      columnWidths.forEach((width) => {
        doc
          .moveTo(currentX, currentRowY)
          .lineTo(currentX, currentRowY + rowHeight)
          .stroke();
        currentX += width;
      });

      // Vẽ đường kẻ dọc cho sub-headers
      const lichHocXRow =
        startX +
        columnWidths[0] +
        columnWidths[1] +
        columnWidths[2] +
        columnWidths[3];
      const catComXRow = lichHocXRow + columnWidths[4];

      // Đường kẻ dọc cho Lịch học
      doc
        .moveTo(lichHocXRow + columnWidths[4] / 2, currentRowY)
        .lineTo(lichHocXRow + columnWidths[4] / 2, currentRowY + rowHeight)
        .stroke();

      // Đường kẻ dọc cho Cắt cơm
      doc
        .moveTo(catComXRow + columnWidths[5] / 3, currentRowY)
        .lineTo(catComXRow + columnWidths[5] / 3, currentRowY + rowHeight)
        .stroke();
      doc
        .moveTo(catComXRow + (2 * columnWidths[5]) / 3, currentRowY)
        .lineTo(catComXRow + (2 * columnWidths[5]) / 3, currentRowY + rowHeight)
        .stroke();

      rowCount++;

      // Kiểm tra nếu cần thêm trang mới
      if (currentRowY + rowHeight > doc.page.height - 100) {
        doc.addPage();
        doc.moveDown(1);
        rowCount = 0;
      }
    });

    // Xử lý merge cells cho đơn vị, STT, và Họ tên
    let mergeCurrentUnit = "";
    let mergeUnitStartRow = 0;
    let currentRowCount = 0;

    allRows.forEach((rowData, rowIndex) => {
      const { student } = rowData;

      if (student.unit !== mergeCurrentUnit) {
        if (mergeCurrentUnit !== "" && currentRowCount > mergeUnitStartRow) {
          // Merge cells cho đơn vị trước đó
          const unitHeight = (currentRowCount - mergeUnitStartRow) * rowHeight;
          const mergeY = dataStartY + mergeUnitStartRow * rowHeight;
          doc.rect(startX, mergeY, columnWidths[0], unitHeight).stroke();
        }
        mergeCurrentUnit = student.unit;
        mergeUnitStartRow = currentRowCount;
      }
      currentRowCount++;
    });

    // Merge cells cho đơn vị cuối cùng
    if (mergeCurrentUnit !== "" && currentRowCount > mergeUnitStartRow) {
      const unitHeight = (currentRowCount - mergeUnitStartRow) * rowHeight;
      const mergeY = dataStartY + mergeUnitStartRow * rowHeight;
      doc.rect(startX, mergeY, columnWidths[0], unitHeight).stroke();
    }

    // Merge cells cho sub-headers
    const lichHocXFinal =
      startX +
      columnWidths[0] +
      columnWidths[1] +
      columnWidths[2] +
      columnWidths[3];
    const catComXFinal = lichHocXFinal + columnWidths[4];

    // Vẽ đường kẻ dọc cho Lịch học
    doc
      .moveTo(lichHocXFinal + columnWidths[4] / 2, dataStartY)
      .lineTo(
        lichHocXFinal + columnWidths[4] / 2,
        dataStartY + rowCount * rowHeight
      )
      .stroke();

    // Vẽ đường kẻ dọc cho Cắt cơm
    doc
      .moveTo(catComXFinal + columnWidths[5] / 3, dataStartY)
      .lineTo(
        catComXFinal + columnWidths[5] / 3,
        dataStartY + rowCount * rowHeight
      )
      .stroke();
    doc
      .moveTo(catComXFinal + (2 * columnWidths[5]) / 3, dataStartY)
      .lineTo(
        catComXFinal + (2 * columnWidths[5]) / 3,
        dataStartY + rowCount * rowHeight
      )
      .stroke();

    // Chữ ký
    doc.moveDown(2);
    const pageWidth = doc.page.width;
    const signatureX = pageWidth - 2.5 * 28.35 - 100;
    const signatureY = doc.y;

    doc
      .font("Roboto-Bold")
      .fontSize(12)
      .text("HỆ TRƯỞNG", signatureX, signatureY, { align: "center" });

    doc.moveDown(3);
    doc
      .font("Roboto-Regular")
      .fontSize(12)
      .text("Bùi Đình Thế", signatureX, doc.y, { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).send(error.toString());
  }
};

const getExcelCutRiceWithSchedule = async (req, res) => {
  try {
    const { unit } = req.query;

    // Lấy dữ liệu cắt cơm
    const Student = require("../models/student");
    let query = {};
    if (unit && unit !== "all") {
      query.unit = unit;
    }

    console.log("=== DEBUG: Query parameters ===");
    console.log("Unit filter:", unit);
    console.log("Query object:", query);

    const students = await Student.find(query).populate("university");
    console.log("=== DEBUG: Students found ===");
    console.log("Total students found:", students.length);
    console.log(
      "Students:",
      students.map((s) => ({
        id: s._id,
        name: s.fullName,
        unit: s.unit,
        hasCutRice: s.cutRice && s.cutRice.length > 0,
        cutRiceData: s.cutRice,
      }))
    );

    // Lọc students có dữ liệu cắt cơm
    const studentsWithCutRice = students.filter(
      (student) => student.cutRice && student.cutRice.length > 0
    );

    console.log("=== DEBUG: Students with cut rice ===");
    console.log("Students with cut rice:", studentsWithCutRice.length);
    console.log("=== DEBUG: Final data processing ===");
    console.log("Total rows to generate:", allRows.length);
    console.log("=== DEBUG: Sample rows ===");
    allRows.slice(0, 3).forEach((row, index) => {
      console.log(`Row ${index + 1}:`, {
        studentName: row.student.fullName,
        unit: row.student.unit,
        day: row.dayNumber,
        dayKey: row.dayKey,
        hasSchedule: row.daySchedule.length > 0,
        scheduleCount: row.daySchedule.length,
        cutRice: {
          breakfast: row.dayData.breakfast,
          lunch: row.dayData.lunch,
          dinner: row.dayData.dinner,
        },
      });
    });
    console.log(
      "Students with cut rice details:",
      studentsWithCutRice.map((s) => ({
        id: s._id,
        name: s.fullName,
        unit: s.unit,
        cutRiceData: s.cutRice,
        cutRiceSummary: s.cutRice?.[0]
          ? {
              monday: {
                breakfast: s.cutRice[0].monday?.breakfast,
                lunch: s.cutRice[0].monday?.lunch,
                dinner: s.cutRice[0].monday?.dinner,
              },
              tuesday: {
                breakfast: s.cutRice[0].tuesday?.breakfast,
                lunch: s.cutRice[0].tuesday?.lunch,
                dinner: s.cutRice[0].tuesday?.dinner,
              },
              wednesday: {
                breakfast: s.cutRice[0].wednesday?.breakfast,
                lunch: s.cutRice[0].wednesday?.lunch,
                dinner: s.cutRice[0].wednesday?.dinner,
              },
              thursday: {
                breakfast: s.cutRice[0].thursday?.breakfast,
                lunch: s.cutRice[0].thursday?.lunch,
                dinner: s.cutRice[0].thursday?.dinner,
              },
              friday: {
                breakfast: s.cutRice[0].friday?.breakfast,
                lunch: s.cutRice[0].friday?.lunch,
                dinner: s.cutRice[0].friday?.dinner,
              },
              saturday: {
                breakfast: s.cutRice[0].saturday?.breakfast,
                lunch: s.cutRice[0].saturday?.lunch,
                dinner: s.cutRice[0].saturday?.dinner,
              },
              sunday: {
                breakfast: s.cutRice[0].sunday?.breakfast,
                lunch: s.cutRice[0].sunday?.lunch,
                dinner: s.cutRice[0].sunday?.dinner,
              },
            }
          : null,
      }))
    );

    if (!studentsWithCutRice || studentsWithCutRice.length === 0) {
      console.log("=== DEBUG: No data found ===");
      console.log("No students with cut rice data found");
      return res.status(404).json({
        message: unit
          ? `Không tìm thấy dữ liệu cắt cơm cho đơn vị: ${unit}`
          : "Không tìm thấy dữ liệu cắt cơm",
      });
    }

    // Lấy dữ liệu lịch học từ API - chỉ lấy lịch học của students đã lọc
    const TimeTable = require("../models/time_table");
    const studentIds = studentsWithCutRice.map((student) => student._id);
    let timeTables = await TimeTable.find({
      studentId: { $in: studentIds },
    }).populate("studentId");

    console.log("=== DEBUG: TimeTable query ===");
    console.log("Student IDs to find:", studentIds);
    console.log("TimeTables found:", timeTables.length);

    console.log("=== DEBUG: TimeTables details ===");
    timeTables.forEach((tt, index) => {
      console.log(`TimeTable ${index + 1}:`, {
        studentId: tt.studentId?._id,
        studentName: tt.studentId?.fullName,
        schedulesCount: tt.schedules?.length || 0,
        schedules: tt.schedules?.map((s) => ({
          day: s.day,
          subject: s.subject,
          time: s.time,
        })),
      });
    });

    // Tạo map để lưu lịch học theo học viên
    const timeTableMap = new Map();

    timeTables.forEach((timeTable) => {
      if (
        timeTable.studentId &&
        timeTable.schedules &&
        timeTable.schedules.length > 0
      ) {
        const studentId = timeTable.studentId._id.toString();
        if (!timeTableMap.has(studentId)) {
          timeTableMap.set(studentId, {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: [],
          });
        }
        const studentSchedule = timeTableMap.get(studentId);
        timeTable.schedules.forEach((schedule) => {
          const dayKey = schedule.day.toLowerCase();
          if (studentSchedule[dayKey]) {
            studentSchedule[dayKey].push({
              subject: schedule.subject,
              time: schedule.time,
              classroom: schedule.classroom,
              schoolWeek: schedule.schoolWeek,
            });
          }
        });
      }
    });

    // Tạo dữ liệu cho từng học viên với mỗi thứ ở dòng riêng
    const allRows = [];
    let dataCurrentUnit = "";
    let unitStudentIndex = 0;

    studentsWithCutRice.forEach((student, studentIndex) => {
      const studentTimeTable = timeTableMap.get(student._id.toString()) || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      };
      const dayKeys = [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ];
      const dayNumbers = ["2", "3", "4", "5", "6", "7", "CN"];

      // Reset STT khi đơn vị thay đổi
      if (student.unit !== dataCurrentUnit) {
        dataCurrentUnit = student.unit;
        unitStudentIndex = 0;
      }
      unitStudentIndex++;

      dayKeys.forEach((dayKey, dayIndex) => {
        const daySchedule = studentTimeTable[dayKey] || [];
        const dayData = student.cutRice[0]?.[dayKey] || {};

        if (
          daySchedule.length > 0 ||
          dayData.breakfast ||
          dayData.lunch ||
          dayData.dinner
        ) {
          allRows.push({
            student,
            studentIndex: unitStudentIndex,
            dayKey,
            dayNumber: dayNumbers[dayIndex],
            daySchedule,
            dayData,
            isFirstRow:
              allRows.length === 0 ||
              allRows[allRows.length - 1].student._id.toString() !==
                student._id.toString(),
          });
        }
      });
    });

    // Tạo workbook và worksheet
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lịch cắt cơm và học tập");

    // Thiết lập orientation landscape
    worksheet.pageSetup.orientation = "landscape";
    worksheet.pageSetup.fitToPage = true;
    worksheet.pageSetup.fitToWidth = 1;
    worksheet.pageSetup.fitToHeight = 0;

    // Định nghĩa cột
    worksheet.columns = [
      { key: "unit", width: 15, header: "Đơn vị" },
      { key: "stt", width: 8, header: "STT" },
      { key: "fullName", width: 30, header: "Họ tên" },
      { key: "day", width: 8, header: "Thứ" },
      { key: "subject", width: 20, header: "Môn học" },
      { key: "time", width: 15, header: "Thời gian" },
      { key: "breakfast", width: 8, header: "Sáng" },
      { key: "lunch", width: 8, header: "Trưa" },
      { key: "dinner", width: 8, header: "Tối" },
    ];

    // Tạo header với merge cells
    const headerRow1 = worksheet.addRow([
      "Đơn vị",
      "STT",
      "Họ tên",
      "Thứ",
      "Lịch học",
      "",
      "Cắt cơm",
      "",
      "",
    ]);
    const headerRow2 = worksheet.addRow([
      "",
      "",
      "",
      "",
      "Môn học",
      "Thời gian",
      "Sáng",
      "Trưa",
      "Tối",
    ]);

    // Merge cells cho header
    worksheet.mergeCells("A1:A2"); // Đơn vị
    worksheet.mergeCells("B1:B2"); // STT
    worksheet.mergeCells("C1:C2"); // Họ tên
    worksheet.mergeCells("D1:D2"); // Thứ
    worksheet.mergeCells("E1:F1"); // Lịch học
    worksheet.mergeCells("G1:I1"); // Cắt cơm

    // Style cho header
    [headerRow1, headerRow2].forEach((row) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { name: "Times New Roman", size: 12, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Thêm dữ liệu
    let currentUnit = "";
    let unitStartRow = 3; // Bắt đầu từ hàng 3 (sau 2 header rows)

    allRows.forEach((rowData, index) => {
      const {
        student,
        studentIndex,
        dayNumber,
        daySchedule,
        dayData,
        isFirstRow,
      } = rowData;

      // Tạo dữ liệu cho từng môn học trong ngày
      if (daySchedule.length > 0) {
        daySchedule.forEach((schedule, scheduleIndex) => {
          const row = worksheet.addRow([
            isFirstRow ? student.unit : "",
            isFirstRow ? studentIndex : "",
            isFirstRow
              ? `${student.fullName}\n${student.university?.name || ""}\n${
                  student.major || ""
                }\n${student.travelTime || ""}`
              : "",
            dayNumber,
            schedule.subject || "",
            schedule.time || "",
            dayData.breakfast ? "X" : "",
            dayData.lunch ? "X" : "",
            dayData.dinner ? "X" : "",
          ]);

          // Style cho row
          row.eachCell((cell, colNumber) => {
            cell.font = { name: "Times New Roman", size: 11 };
            cell.alignment = {
              vertical: "middle",
              horizontal: "center",
              wrapText: true,
            };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      } else {
        // Nếu không có lịch học, vẫn hiển thị dòng cắt cơm
        const row = worksheet.addRow([
          isFirstRow ? student.unit : "",
          isFirstRow ? studentIndex : "",
          isFirstRow
            ? `${student.fullName}\n${student.university?.name || ""}\n${
                student.major || ""
              }\n${student.travelTime || ""}`
            : "",
          dayNumber,
          "",
          "",
          dayData.breakfast ? "X" : "",
          dayData.lunch ? "X" : "",
          dayData.dinner ? "X" : "",
        ]);

        // Style cho row
        row.eachCell((cell, colNumber) => {
          cell.font = { name: "Times New Roman", size: 11 };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      // Logic merge cells cho đơn vị
      if (student.unit !== currentUnit) {
        if (currentUnit !== "" && worksheet.rowCount > unitStartRow) {
          worksheet.mergeCells(`A${unitStartRow}:A${worksheet.rowCount - 1}`);
          worksheet.getCell(`A${unitStartRow}`).alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
        currentUnit = student.unit;
        unitStartRow = worksheet.rowCount;
      }
    });

    // Merge cells cho đơn vị cuối cùng
    if (currentUnit !== "" && worksheet.rowCount > unitStartRow) {
      worksheet.mergeCells(`A${unitStartRow}:A${worksheet.rowCount}`);
      worksheet.getCell(`A${unitStartRow}`).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    }

    // Thêm chữ ký
    const signatureRow = worksheet.rowCount + 2;
    worksheet.mergeCells(`G${signatureRow}:I${signatureRow}`);
    worksheet.getCell(`G${signatureRow}`).value = "PHÓ HỆ TRƯỞNG";
    worksheet.getCell(`G${signatureRow}`).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell(`G${signatureRow}`).font = {
      name: "Times New Roman",
      size: 12,
      bold: true,
    };

    // Tạo buffer và gửi file
    const buffer = await workbook.xlsx.writeBuffer();

    // Tạo tên file động
    const currentDate = new Date();
    const dateString = currentDate
      .toLocaleDateString("vi-VN")
      .replace(/\//g, "-");
    const timeString = currentDate
      .toLocaleTimeString("vi-VN")
      .replace(/:/g, "-");
    const fileName = `Lich_cat_com_va_hoc_tap_${
      unit || "tat_ca"
    }_${dateString}_${timeString}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Lỗi khi xuất Excel:", error);
    res.status(500).json({ message: "Lỗi khi xuất file Excel" });
  }
};

const updateStudentRating = async (req, res) => {
  try {
    const { yearlyResultId } = req.params;
    const { partyRating, trainingRating, decisionNumber, studentId } = req.body;

    const Student = require("../models/student");

    // Tìm student theo studentId
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tìm yearly result cần cập nhật
    const yearlyIndex = student.yearlyResults.findIndex(
      (result) => result._id.toString() === yearlyResultId
    );

    if (yearlyIndex === -1) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy kết quả năm học" });
    }

    // Cập nhật xếp loại đảng viên
    if (partyRating) {
      student.yearlyResults[yearlyIndex].partyRating = {
        decisionNumber: decisionNumber || "",
        rating: partyRating,
      };
    }

    // Cập nhật xếp loại rèn luyện
    if (trainingRating) {
      student.yearlyResults[yearlyIndex].trainingRating = trainingRating;
    }

    // Lưu thay đổi
    await student.save();

    res.status(200).json({
      message: "Cập nhật xếp loại thành công",
      data: student.yearlyResults[yearlyIndex],
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật xếp loại:", error);
    res.status(500).json({ message: "Lỗi khi cập nhật xếp loại" });
  }
};

// Lấy danh sách năm học có dữ liệu
const getAvailableYears = async (req, res) => {
  try {
    const Student = require("../models/student");

    const students = await Student.find({
      "yearlyResults.0": { $exists: true },
    });

    const years = [
      ...new Set(
        students.flatMap((student) =>
          student.yearlyResults.map((yearly) => yearly.schoolYear)
        )
      ),
    ]
      .sort()
      .reverse();

    res.status(200).json({ years });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách năm học:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy dữ liệu thống kê theo năm học
const getYearlyResults = async (req, res) => {
  try {
    const { schoolYear } = req.query;

    if (!schoolYear) {
      return res.status(400).json({ message: "Vui lòng cung cấp năm học" });
    }

    const Student = require("../models/student");

    const students = await Student.find({
      "yearlyResults.schoolYear": schoolYear,
    }).populate("class");

    const results = students
      .map((student) => {
        const yearlyResult = student.yearlyResults.find(
          (yearly) => yearly.schoolYear === schoolYear
        );
        if (!yearlyResult) return null;

        return {
          _id: yearlyResult._id,
          fullName: student.fullName,
          unit: student.unit,
          className: student.class?.className,
          schoolYear: yearlyResult.schoolYear,
          averageGrade4: yearlyResult.averageGrade4,
          averageGrade10: yearlyResult.averageGrade10,
          cumulativeCredits: yearlyResult.cumulativeCredits,
          academicStatus: yearlyResult.academicStatus,
          partyRating: yearlyResult.partyRating,
          trainingRating: yearlyResult.trainingRating,
          positionParty: student.positionParty,
        };
      })
      .filter((result) => result !== null);

    res.status(200).json({ results });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu thống kê theo năm:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thống kê theo năm học
const getYearlyStatistics = async (req, res) => {
  try {
    const { schoolYear } = req.query;
    console.log("=== getYearlyStatistics START ===");
    console.log("Query parameters:", { schoolYear });

    // Nếu không có schoolYear, lấy tất cả dữ liệu
    if (!schoolYear) {
      console.log("No schoolYear provided, fetching all data");
    }

    // Lấy tất cả students với thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    console.log("Total students found:", students.length);

    let yearlyResults = [];

    // Lặp qua từng student để tính toán kết quả năm học
    for (const student of students) {
      console.log(
        `Processing student: ${student.fullName} (${student.studentId})`
      );

      try {
        // Lấy tất cả kết quả học kỳ
        const semesterResults = student.semesterResults || [];
        let yearResults;

        if (schoolYear) {
          // Nếu có schoolYear, lọc theo năm học
          yearResults = semesterResults.filter(
            (result) => result.schoolYear === schoolYear
          );

          if (yearResults.length === 0) {
            console.log(`  - No results found for school year ${schoolYear}`);
            continue;
          }
        } else {
          // Nếu không có schoolYear, lấy tất cả kết quả
          yearResults = semesterResults;

          if (yearResults.length === 0) {
            console.log(`  - No results found for student`);
            continue;
          }
        }

        console.log(
          `  - Found ${yearResults.length} semester results for ${schoolYear}`
        );

        // Tính toán kết quả
        if (schoolYear) {
          // Nếu có schoolYear, tính toán cho năm học cụ thể
          let totalCredits = 0;
          let totalGradePoints = 0;
          let totalGradePoints10 = 0;
          let allSubjects = [];
          let yearlyFailedSubjects = 0;
          let yearlyDebtCredits = 0;

          yearResults.forEach((result) => {
            const subjects = Array.isArray(result.subjects)
              ? result.subjects
              : [];
            const normalizedSubjects = subjects.map((s) => {
              let letter = s.letterGrade;
              if (!letter) {
                if (typeof s.gradePoint10 === "number") {
                  letter = gradeHelper.grade10ToLetter(s.gradePoint10);
                } else if (typeof s.gradePoint4 === "number") {
                  letter = gradeHelper.grade4ToLetter(s.gradePoint4);
                }
              }
              const gradePoint4 = gradeHelper.letterToGrade4(letter);
              const gradePoint10 = gradeHelper.letterToGrade10(letter);
              return {
                ...(s.toObject?.() || s),
                letterGrade: letter,
                gradePoint4,
                gradePoint10,
              };
            });

            const failedSubjects =
              gradeHelper.calculateFailedSubjects(normalizedSubjects);
            const debtCredits =
              gradeHelper.calculateDebtCredits(normalizedSubjects);
            yearlyFailedSubjects += failedSubjects;
            yearlyDebtCredits += debtCredits;

            normalizedSubjects.forEach((subject) => {
              const credits = subject.credits || 0;
              const gradePoint4 = subject.gradePoint4 || 0;
              const gradePoint10 = subject.gradePoint10 || 0;
              totalCredits += credits;
              totalGradePoints += credits * gradePoint4;
              totalGradePoints10 += credits * gradePoint10;
              allSubjects.push(subject);
            });
          });

          const yearlyGPA =
            totalCredits > 0
              ? (totalGradePoints / totalCredits).toFixed(2)
              : "0.00";
          const yearlyGrade10 =
            totalCredits > 0
              ? (totalGradePoints10 / totalCredits).toFixed(2)
              : "0.00";

          // Tính toán CPA tích lũy (lấy từ kết quả cuối cùng của năm học)
          const lastResult = yearResults[yearResults.length - 1];
          const cumulativeGPA =
            lastResult.cumulativeGrade4?.toFixed(2) || "0.00";
          const cumulativeGrade10 =
            lastResult.cumulativeGrade10?.toFixed(2) || "0.00";
          const cumulativeCredits = lastResult.cumulativeCredits || 0;
          const totalDebt = lastResult.totalDebt || 0;
          const studentLevel = lastResult.studentLevel || 1;

          // Tìm yearlyResult tương ứng trong student.yearlyResults
          const existingYearlyResult = student.yearlyResults?.find(
            (result) => result.schoolYear === schoolYear
          );

          // Tạo kết quả thống kê năm học
          const yearlyResult = {
            _id: student._id,
            studentId: student._id,
            fullName: student.fullName,
            studentCode: student.studentId,
            university: student.university?.universityName || "",
            className: student.class?.className || "",
            unit: student.unit || "",
            positionParty: student.positionParty || "Không",
            schoolYear: schoolYear,
            yearlyResultId: existingYearlyResult?._id || null,
            yearlyGPA: yearlyGPA,
            yearlyGrade10: yearlyGrade10,
            cumulativeGPA: cumulativeGPA,
            cumulativeGrade10: cumulativeGrade10,
            cumulativeCredit: cumulativeCredits,
            totalDebt: totalDebt,
            studentLevel: studentLevel,
            subjects: allSubjects,
            totalCredits: totalCredits,
            semesterCount: yearResults.length,
            partyRating: existingYearlyResult?.partyRating || null,
            trainingRating: existingYearlyResult?.trainingRating || null,
            academicStatus: existingYearlyResult?.academicStatus || null,
            totalSubjects: existingYearlyResult?.totalSubjects || 0,
            passedSubjects: existingYearlyResult?.passedSubjects || 0,
            failedSubjects: yearlyFailedSubjects,
            debtCredits: yearlyDebtCredits,
          };

          console.log(
            `  - Yearly result: ${yearlyResult.fullName} - GPA: ${yearlyGPA}, CPA: ${cumulativeGPA}`
          );
          yearlyResults.push(yearlyResult);
        } else {
          // Nếu không có schoolYear, sử dụng dữ liệu từ yearlyResults có sẵn
          if (student.yearlyResults && student.yearlyResults.length > 0) {
            student.yearlyResults.forEach((yearlyResult) => {
              // Tính toán GPA từ semesterResults cho năm học này
              const yearSemesterResults = semesterResults.filter(
                (result) => result.schoolYear === yearlyResult.schoolYear
              );

              let totalCredits = 0;
              let totalGradePoints = 0;
              let totalGradePoints10 = 0;
              let allSubjects = [];

              yearSemesterResults.forEach((result) => {
                if (result.subjects && result.subjects.length > 0) {
                  result.subjects.forEach((subject) => {
                    const credits = subject.credits || 0;
                    const gradePoint4 = subject.gradePoint4 || 0;
                    const gradePoint10 = subject.gradePoint10 || 0;

                    totalCredits += credits;
                    totalGradePoints += credits * gradePoint4;
                    totalGradePoints10 += credits * gradePoint10;
                    allSubjects.push(subject);
                  });
                }
              });

              const yearlyGPA =
                totalCredits > 0
                  ? (totalGradePoints / totalCredits).toFixed(2)
                  : "0.00";
              const yearlyGrade10 =
                totalCredits > 0
                  ? (totalGradePoints10 / totalCredits).toFixed(2)
                  : "0.00";

              // Tính toán CPA tích lũy (lấy từ kết quả cuối cùng của năm học)
              const lastResult =
                yearSemesterResults[yearSemesterResults.length - 1];
              const cumulativeGPA =
                lastResult?.cumulativeGrade4?.toFixed(2) || "0.00";
              const cumulativeGrade10 =
                lastResult?.cumulativeGrade10?.toFixed(2) || "0.00";
              const cumulativeCredits = lastResult?.cumulativeCredits || 0;
              const totalDebt = lastResult?.totalDebt || 0;

              const result = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: yearlyResult.schoolYear,
                yearlyResultId: yearlyResult._id,
                yearlyGPA: yearlyGPA,
                yearlyGrade10: yearlyGrade10,
                cumulativeGPA: cumulativeGPA,
                cumulativeGrade10: cumulativeGrade10,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                subjects: allSubjects,
                totalCredits: totalCredits,
                semesterCount: yearSemesterResults.length,
                partyRating: yearlyResult.partyRating || null,
                trainingRating: yearlyResult.trainingRating || null,
                academicStatus: yearlyResult.academicStatus || null,
                totalSubjects: yearlyResult.totalSubjects || 0,
                passedSubjects: yearlyResult.passedSubjects || 0,
                failedSubjects: yearlyResult.failedSubjects || 0,
              };

              console.log(
                `  - Yearly result for ${yearlyResult.schoolYear}: ${result.fullName} - GPA: ${yearlyGPA}, CPA: ${cumulativeGPA}`
              );
              yearlyResults.push(result);
            });
          } else {
            // Fallback: tạo kết quả cho từng năm học từ semesterResults
            const yearGroups = {};

            yearResults.forEach((result) => {
              const year = result.schoolYear;
              if (!yearGroups[year]) {
                yearGroups[year] = {
                  results: [],
                  totalCredits: 0,
                  totalGradePoints: 0,
                  totalGradePoints10: 0,
                  allSubjects: [],
                };
              }

              yearGroups[year].results.push(result);

              if (result.subjects && result.subjects.length > 0) {
                result.subjects.forEach((subject) => {
                  const credits = subject.credits || 0;
                  const gradePoint4 = subject.gradePoint4 || 0;
                  const gradePoint10 = subject.gradePoint10 || 0;

                  yearGroups[year].totalCredits += credits;
                  yearGroups[year].totalGradePoints += credits * gradePoint4;
                  yearGroups[year].totalGradePoints10 += credits * gradePoint10;
                  yearGroups[year].allSubjects.push(subject);
                });
              }
            });

            // Tạo kết quả cho từng năm học
            Object.keys(yearGroups).forEach((year) => {
              const group = yearGroups[year];
              const yearlyGPA =
                group.totalCredits > 0
                  ? (group.totalGradePoints / group.totalCredits).toFixed(2)
                  : "0.00";
              const yearlyGrade10 =
                group.totalCredits > 0
                  ? (group.totalGradePoints10 / group.totalCredits).toFixed(2)
                  : "0.00";

              // Tính toán CPA tích lũy (lấy từ kết quả cuối cùng của năm học)
              const lastResult = group.results[group.results.length - 1];
              const cumulativeGPA =
                lastResult.cumulativeGrade4?.toFixed(2) || "0.00";
              const cumulativeGrade10 =
                lastResult.cumulativeGrade10?.toFixed(2) || "0.00";
              const cumulativeCredits = lastResult.cumulativeCredits || 0;
              const totalDebt = lastResult.totalDebt || 0;

              const yearlyResult = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: year,
                yearlyResultId: null, // Không có yearlyResult
                yearlyGPA: yearlyGPA,
                yearlyGrade10: yearlyGrade10,
                cumulativeGPA: cumulativeGPA,
                cumulativeGrade10: cumulativeGrade10,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                subjects: group.allSubjects,
                totalCredits: group.totalCredits,
                semesterCount: group.results.length,
                partyRating: null,
                trainingRating: null,
                academicStatus: null,
                totalSubjects: 0,
                passedSubjects: 0,
                failedSubjects: 0,
              };

              console.log(
                `  - Yearly result for ${year}: ${yearlyResult.fullName} - GPA: ${yearlyGPA}, CPA: ${cumulativeGPA}`
              );
              yearlyResults.push(yearlyResult);
            });
          }
        }
      } catch (error) {
        console.log(`Error processing student ${student._id}:`, error);
      }
    }

    console.log("=== getYearlyStatistics END ===");
    console.log("Final yearly results count:", yearlyResults.length);

    return res.status(200).json(yearlyResults);
  } catch (error) {
    console.error("Error in getYearlyStatistics:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// API lấy dữ liệu xếp loại đảng viên
const getPartyRatings = async (req, res) => {
  try {
    const { schoolYear } = req.query;
    console.log("=== getPartyRatings START ===");
    console.log("Query parameters:", { schoolYear });

    // Lấy tất cả students với thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    console.log("Total students found:", students.length);

    let partyRatings = [];

    // Lặp qua từng student để lấy dữ liệu xếp loại đảng viên
    for (const student of students) {
      console.log(
        `Processing student: ${student.fullName} (${student.studentId})`
      );

      try {
        // Lấy tất cả kết quả học kỳ
        const semesterResults = student.semesterResults || [];
        let yearResults;

        if (schoolYear) {
          // Nếu có schoolYear, lọc theo năm học
          yearResults = semesterResults.filter(
            (result) => result.schoolYear === schoolYear
          );

          if (yearResults.length === 0) {
            console.log(`  - No results found for school year ${schoolYear}`);
            continue;
          }
        } else {
          // Nếu không có schoolYear, lấy tất cả kết quả
          yearResults = semesterResults;

          if (yearResults.length === 0) {
            console.log(`  - No results found for student`);
            continue;
          }
        }

        // Tính toán kết quả
        if (schoolYear) {
          // Nếu có schoolYear, tính toán cho năm học cụ thể
          const lastResult = yearResults[yearResults.length - 1];
          const cumulativeCredits = lastResult.cumulativeCredits || 0;
          const totalDebt = lastResult.totalDebt || 0;
          const studentLevel = lastResult.studentLevel || 1;

          // Tìm yearlyResult tương ứng trong student.yearlyResults
          const existingYearlyResult = student.yearlyResults?.find(
            (result) => result.schoolYear === schoolYear
          );

          // Tạo kết quả xếp loại đảng viên
          const partyRating = {
            _id: student._id,
            studentId: student._id,
            fullName: student.fullName,
            studentCode: student.studentId,
            university: student.university?.universityName || "",
            className: student.class?.className || "",
            unit: student.unit || "",
            positionParty: student.positionParty || "Không",
            schoolYear: schoolYear,
            yearlyResultId: existingYearlyResult?._id || null,
            cumulativeCredit: cumulativeCredits,
            totalDebt: totalDebt,
            studentLevel: studentLevel,
            semesterCount: yearResults.length,
            partyRating: existingYearlyResult?.partyRating || null,
          };

          console.log(
            `  - Party rating: ${partyRating.fullName} - Position: ${partyRating.positionParty}`
          );
          partyRatings.push(partyRating);
        } else {
          // Nếu không có schoolYear, sử dụng dữ liệu từ yearlyResults có sẵn
          if (student.yearlyResults && student.yearlyResults.length > 0) {
            student.yearlyResults.forEach((yearlyResult) => {
              // Tính toán từ semesterResults cho năm học này
              const yearSemesterResults = semesterResults.filter(
                (result) => result.schoolYear === yearlyResult.schoolYear
              );

              const lastResult =
                yearSemesterResults[yearSemesterResults.length - 1];
              const cumulativeCredits = lastResult?.cumulativeCredits || 0;
              const totalDebt = lastResult?.totalDebt || 0;

              const result = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: yearlyResult.schoolYear,
                yearlyResultId: yearlyResult._id,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                semesterCount: yearSemesterResults.length,
                partyRating: yearlyResult.partyRating || null,
              };

              console.log(
                `  - Party rating for ${yearlyResult.schoolYear}: ${result.fullName} - Position: ${result.positionParty}`
              );
              partyRatings.push(result);
            });
          } else {
            // Fallback: tạo kết quả cho từng năm học từ semesterResults
            const yearGroups = {};

            yearResults.forEach((result) => {
              const year = result.schoolYear;
              if (!yearGroups[year]) {
                yearGroups[year] = {
                  results: [],
                };
              }

              yearGroups[year].results.push(result);
            });

            // Tạo kết quả cho từng năm học
            Object.keys(yearGroups).forEach((year) => {
              const group = yearGroups[year];
              const lastResult = group.results[group.results.length - 1];
              const cumulativeCredits = lastResult.cumulativeCredits || 0;
              const totalDebt = lastResult.totalDebt || 0;

              const partyRating = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: year,
                yearlyResultId: null,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                semesterCount: group.results.length,
                partyRating: null,
              };

              console.log(
                `  - Party rating for ${year}: ${partyRating.fullName} - Position: ${partyRating.positionParty}`
              );
              partyRatings.push(partyRating);
            });
          }
        }
      } catch (error) {
        console.log(`Error processing student ${student._id}:`, error);
      }
    }

    console.log("=== getPartyRatings END ===");
    console.log("Final party ratings count:", partyRatings.length);

    return res.status(200).json(partyRatings);
  } catch (error) {
    console.error("Error in getPartyRatings:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// API lấy dữ liệu xếp loại rèn luyện
const getTrainingRatings = async (req, res) => {
  try {
    const { schoolYear } = req.query;
    console.log("=== getTrainingRatings START ===");
    console.log("Query parameters:", { schoolYear });

    // Lấy tất cả students với thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
    ]);

    console.log("Total students found:", students.length);

    let trainingRatings = [];

    // Lặp qua từng student để lấy dữ liệu xếp loại rèn luyện
    for (const student of students) {
      console.log(
        `Processing student: ${student.fullName} (${student.studentId})`
      );

      try {
        // Lấy tất cả kết quả học kỳ
        const semesterResults = student.semesterResults || [];
        let yearResults;

        if (schoolYear) {
          // Nếu có schoolYear, lọc theo năm học
          yearResults = semesterResults.filter(
            (result) => result.schoolYear === schoolYear
          );

          if (yearResults.length === 0) {
            console.log(`  - No results found for school year ${schoolYear}`);
            continue;
          }
        } else {
          // Nếu không có schoolYear, lấy tất cả kết quả
          yearResults = semesterResults;

          if (yearResults.length === 0) {
            console.log(`  - No results found for student`);
            continue;
          }
        }

        // Tính toán kết quả
        if (schoolYear) {
          // Nếu có schoolYear, tính toán cho năm học cụ thể
          const lastResult = yearResults[yearResults.length - 1];
          const cumulativeCredits = lastResult.cumulativeCredits || 0;
          const totalDebt = lastResult.totalDebt || 0;
          const studentLevel = lastResult.studentLevel || 1;

          // Tìm yearlyResult tương ứng trong student.yearlyResults
          const existingYearlyResult = student.yearlyResults?.find(
            (result) => result.schoolYear === schoolYear
          );

          // Tạo kết quả xếp loại rèn luyện
          const trainingRating = {
            _id: student._id,
            studentId: student._id,
            fullName: student.fullName,
            studentCode: student.studentId,
            university: student.university?.universityName || "",
            className: student.class?.className || "",
            unit: student.unit || "",
            positionParty: student.positionParty || "Không",
            schoolYear: schoolYear,
            yearlyResultId: existingYearlyResult?._id || null,
            cumulativeCredit: cumulativeCredits,
            totalDebt: totalDebt,
            studentLevel: studentLevel,
            semesterCount: yearResults.length,
            trainingRating: existingYearlyResult?.trainingRating || null,
          };

          console.log(
            `  - Training rating: ${trainingRating.fullName} - Rating: ${trainingRating.trainingRating}`
          );
          trainingRatings.push(trainingRating);
        } else {
          // Nếu không có schoolYear, sử dụng dữ liệu từ yearlyResults có sẵn
          if (student.yearlyResults && student.yearlyResults.length > 0) {
            student.yearlyResults.forEach((yearlyResult) => {
              // Tính toán từ semesterResults cho năm học này
              const yearSemesterResults = semesterResults.filter(
                (result) => result.schoolYear === yearlyResult.schoolYear
              );

              const lastResult =
                yearSemesterResults[yearSemesterResults.length - 1];
              const cumulativeCredits = lastResult?.cumulativeCredits || 0;
              const totalDebt = lastResult?.totalDebt || 0;

              const result = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: yearlyResult.schoolYear,
                yearlyResultId: yearlyResult._id,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                semesterCount: yearSemesterResults.length,
                trainingRating: yearlyResult.trainingRating || null,
              };

              console.log(
                `  - Training rating for ${yearlyResult.schoolYear}: ${result.fullName} - Rating: ${result.trainingRating}`
              );
              trainingRatings.push(result);
            });
          } else {
            // Fallback: tạo kết quả cho từng năm học từ semesterResults
            const yearGroups = {};

            yearResults.forEach((result) => {
              const year = result.schoolYear;
              if (!yearGroups[year]) {
                yearGroups[year] = {
                  results: [],
                };
              }

              yearGroups[year].results.push(result);
            });

            // Tạo kết quả cho từng năm học
            Object.keys(yearGroups).forEach((year) => {
              const group = yearGroups[year];
              const lastResult = group.results[group.results.length - 1];
              const cumulativeCredits = lastResult.cumulativeCredits || 0;
              const totalDebt = lastResult.totalDebt || 0;

              const trainingRating = {
                _id: student._id,
                studentId: student._id,
                fullName: student.fullName,
                studentCode: student.studentId,
                university: student.university?.universityName || "",
                className: student.class?.className || "",
                unit: student.unit || "",
                positionParty: student.positionParty || "Không",
                schoolYear: year,
                yearlyResultId: null,
                cumulativeCredit: cumulativeCredits,
                totalDebt: totalDebt,
                semesterCount: group.results.length,
                trainingRating: null,
              };

              console.log(
                `  - Training rating for ${year}: ${trainingRating.fullName} - Rating: ${trainingRating.trainingRating}`
              );
              trainingRatings.push(trainingRating);
            });
          }
        }
      } catch (error) {
        console.log(`Error processing student ${student._id}:`, error);
      }
    }

    console.log("=== getTrainingRatings END ===");
    console.log("Final training ratings count:", trainingRatings.length);

    return res.status(200).json(trainingRatings);
  } catch (error) {
    console.error("Error in getTrainingRatings:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getWordTuitionFee = async (req, res) => {
  try {
    const semesterQuery = req.query.semester;
    const schoolYearQuery = req.query.schoolYear;
    const unitQuery = req.query.unit;

    // Populate university và class để lấy thông tin đầy đủ
    const students = await Student.find().populate([
      { path: "university", select: "universityName" },
      { path: "class", select: "className" },
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
          schoolYear: tuitionFee.schoolYear,
          content: tuitionFee.content,
          status: tuitionFee.status,
        });
      });
    });

    // Lọc theo học kỳ
    if (semesterQuery && semesterQuery !== "all") {
      const semesterArray = semesterQuery.split(",");
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return semesterArray.includes(tuitionFee.semester);
      });
    }

    // Lọc theo năm học
    if (schoolYearQuery && schoolYearQuery !== "all") {
      const schoolYearArray = schoolYearQuery.split(",");
      tuitionFees = tuitionFees.filter((tuitionFee) => {
        return schoolYearArray.includes(tuitionFee.schoolYear);
      });
    }

    // Lọc theo đơn vị
    if (unitQuery && unitQuery !== "all") {
      const unitArray = unitQuery.split(",");

      tuitionFees = tuitionFees.filter((tuitionFee) => {
        const isIncluded = unitArray.some(
          (unitName) =>
            tuitionFee.className === unitName ||
            tuitionFee.unit === unitName ||
            tuitionFee.className.includes(unitName) ||
            tuitionFee.unit.includes(unitName)
        );

        return isIncluded;
      });
    }

    // Sắp xếp theo thứ tự từ L1 đến L6
    tuitionFees.sort((a, b) => {
      const unitOrder = {
        "L1 - H5": 1,
        "L2 - H5": 2,
        "L3 - H5": 3,
        "L4 - H5": 4,
        "L5 - H5": 5,
        "L6 - H5": 6,
      };

      const aOrder = unitOrder[a.unit] || 999;
      const bOrder = unitOrder[b.unit] || 999;

      return aOrder - bOrder;
    });

    // Tính tổng học phí và phân loại theo trạng thái
    const totalAmountSum = tuitionFees.reduce((sum, tuitionFee) => {
      return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
    }, 0);

    const paidAmountSum = tuitionFees
      .filter((tuitionFee) => tuitionFee.status === "Đã thanh toán")
      .reduce((sum, tuitionFee) => {
        return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
      }, 0);

    const unpaidAmountSum = tuitionFees
      .filter((tuitionFee) => tuitionFee.status === "Chưa thanh toán")
      .reduce((sum, tuitionFee) => {
        return sum + parseInt(tuitionFee.totalAmount.replace(/\./g, ""));
      }, 0);

    // Tạo tên file động dựa trên các tham số
    let fileName = "Thong_ke_hoc_phi_he_hoc_vien_5";

    // Thêm thông tin học kỳ
    if (semesterQuery && semesterQuery !== "all") {
      const semesterArray = semesterQuery.split(",");
      fileName += `_${semesterArray.join("_")}`;
    } else {
      fileName += "_tat_ca_hoc_ky";
    }

    // Thêm thông tin năm học
    if (schoolYearQuery && schoolYearQuery !== "all") {
      const schoolYearArray = schoolYearQuery.split(",");
      const uniqueSchoolYears = [...new Set(schoolYearArray)];
      fileName += `_${uniqueSchoolYears.join("_")}`;
    } else {
      fileName += "_tat_ca_nam_hoc";
    }

    // Thêm thông tin đơn vị
    if (unitQuery && unitQuery !== "all") {
      const unitArray = unitQuery.split(",");
      fileName += `_${unitArray.join("_")}`;
    } else {
      fileName += "_tat_ca_don_vi";
    }

    fileName += ".docx";

    // Sử dụng docx đã được import ở đầu file
    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
    } = require("docx");

    // Lấy ngày tháng năm hiện tại
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Tạo tiêu đề phù hợp
    let title = "Thống kê học phí";
    let titleParts = [];

    if (
      semesterQuery &&
      semesterQuery !== "all" &&
      schoolYearQuery &&
      schoolYearQuery !== "all"
    ) {
      const semesterArray = semesterQuery.split(",");
      const schoolYearArray = schoolYearQuery.split(",");
      const uniqueSchoolYears = [...new Set(schoolYearArray)];

      if (uniqueSchoolYears.length === 1) {
        titleParts.push(
          `học kỳ ${semesterArray.join(",")} năm học ${uniqueSchoolYears[0]}`
        );
      } else {
        const combined = semesterArray.map(
          (semester, index) => `${semester} năm học ${schoolYearArray[index]}`
        );
        titleParts.push(`học kỳ ${combined.join(", ")}`);
      }
    } else {
      if (semesterQuery && semesterQuery !== "all") {
        titleParts.push(`học kỳ ${semesterQuery}`);
      }
      if (schoolYearQuery && schoolYearQuery !== "all") {
        titleParts.push(`năm học ${schoolYearQuery}`);
      }
    }

    if (unitQuery && unitQuery !== "all") {
      const unitArray = unitQuery.split(",");
      titleParts.push(`đơn vị ${unitArray.join(", ")}`);
    }

    if (titleParts.length > 0) {
      title += ` ${titleParts.join(", ")}`;
    }

    // Tạo bảng dữ liệu đơn giản
    const tableRows = [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Đơn vị", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Họ và tên", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Trường Đại học", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Loại tiền phải đóng",
                    bold: true,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Số tiền(VND)", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Trạng thái", bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ];

    // Thêm dữ liệu vào bảng
    tuitionFees.forEach((tuitionFee) => {
      const formatCurrency = (amount) => {
        if (!amount) return "";
        return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      };

      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  text: tuitionFee.unit || "",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: tuitionFee.fullName,
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: (tuitionFee.university || "")
                    .replace("Đại học ", "")
                    .trim(),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: (tuitionFee.content || "")
                    .replace("Tổng ", "")
                    .replace("học kỳ", "HK")
                    .replace("học phí", "HP"),
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: formatCurrency(tuitionFee.totalAmount) || "",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  text: tuitionFee.status || "",
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "HỌC VIỆN KHOA HỌC QUÂN SỰ",
                  bold: true,
                  size: 24,
                }),
                new TextRun({
                  text: "      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                  bold: true,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "               HỆ HỌC VIÊN 5",
                  bold: true,
                  size: 24,
                }),
                new TextRun({
                  text: "                                         Độc lập - Tự do - Hạnh phúc",
                  bold: true,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.JUSTIFIED,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Hà Nội, ngày ${day} tháng ${month} năm ${year}`,
                  italic: true,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Tiêu đề
            new Paragraph({
              children: [
                new TextRun({ text: "BÁO CÁO", bold: true, size: 28 }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: title, bold: true, size: 24 })],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Thống kê tổng quan
            new Paragraph({
              children: [
                new TextRun({
                  text: `1. Tổng số tiền học phí: ${totalAmountSum.toLocaleString(
                    "vi-VN",
                    { style: "currency", currency: "VND" }
                  )}`,
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `2. Cần thanh toán: ${unpaidAmountSum.toLocaleString(
                    "vi-VN",
                    { style: "currency", currency: "VND" }
                  )}`,
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `3. Đã thanh toán: ${paidAmountSum.toLocaleString(
                    "vi-VN",
                    { style: "currency", currency: "VND" }
                  )}`,
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Bảng dữ liệu
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: tableRows,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),

            // Chữ ký
            new Paragraph({
              children: [
                new TextRun({ text: "HỆ TRƯỞNG", bold: true, size: 24 }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [new TextRun({ text: "Bùi Đình Thế", size: 24 })],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Lỗi tạo file Word:", error);

    // Trả về JSON error để frontend có thể hiển thị thông báo
    res.status(500).json({
      message: "Lỗi tạo file Word: " + error.message,
      error: error.message,
      success: false,
    });
  }
};

// Lấy danh sách sinh viên đã ra trường
const getGraduatedStudents = async (req, res) => {
  try {
    const students = await Student.find({
      graduationDate: { $exists: true, $ne: null },
    })
      .populate("university")
      .populate("class");

    const graduatedStudents = students.map((student) => ({
      _id: student._id,
      studentId: student.studentId,
      fullName: student.fullName,
      unit: student.unit,
      avatar: student.avatar,
      graduationDate: student.graduationDate,
      university: student.university?.universityName || student.university,
      class: student.class?.className || student.class,
    }));

    res.status(200).json(graduatedStudents);
  } catch (error) {
    console.error("Lỗi lấy danh sách sinh viên đã ra trường:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy tất cả sinh viên cho modal cập nhật đồng loạt
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find()
      .populate("university")
      .populate("class")
      .sort({ dateOfEnlistment: -1 }); // Sắp xếp theo ngày nhập ngũ giảm dần

    const allStudents = students.map((student) => ({
      _id: student._id,
      studentId: student.studentId,
      fullName: student.fullName,
      unit: student.unit,
      avatar: student.avatar,
      enrollment: student.enrollment,
      dateOfEnlistment: student.dateOfEnlistment,
      graduationDate: student.graduationDate,
      university: student.university?.universityName || student.university,
      class: student.class?.className || student.class,
    }));

    res.status(200).json(allStudents);
  } catch (error) {
    console.error("Lỗi lấy danh sách tất cả sinh viên:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy danh sách các năm enrollment từ database
const getEnrollmentYears = async (req, res) => {
  try {
    const years = await Student.distinct("enrollment");
    const sortedYears = years.filter((year) => year).sort((a, b) => b - a); // Sắp xếp giảm dần và loại bỏ null/undefined

    res.status(200).json(sortedYears);
  } catch (error) {
    console.error("Lỗi lấy danh sách năm enrollment:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy danh sách các năm học từ database
const getSchoolYears = async (req, res) => {
  try {
    const Semester = require("../models/semester");
    const schoolYears = await Semester.distinct("schoolYear");
    const sortedSchoolYears = schoolYears
      .filter((year) => year)
      .sort((a, b) => {
        // Sắp xếp theo năm học, ví dụ: "2025-2026" > "2024-2025"
        const yearA = parseInt(a.split("-")[0]);
        const yearB = parseInt(b.split("-")[0]);
        return yearB - yearA; // Sắp xếp giảm dần
      });

    res.status(200).json(sortedSchoolYears);
  } catch (error) {
    console.error("Lỗi lấy danh sách năm học:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Cập nhật đồng loạt ngày ra trường
const bulkUpdateGraduationDate = async (req, res) => {
  try {
    const { studentIds, graduationDate } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Danh sách sinh viên không hợp lệ" });
    }

    // Cho phép graduationDate là null hoặc undefined để đánh dấu sinh viên chưa ra trường
    let updateData = {};
    if (graduationDate) {
      updateData.graduationDate = new Date(graduationDate);
    } else {
      updateData.graduationDate = null;
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      const message = graduationDate
        ? `Cập nhật ngày ra trường thành công cho ${result.modifiedCount} sinh viên`
        : `Đánh dấu ${result.modifiedCount} sinh viên chưa ra trường thành công`;

      res.status(200).json({
        message: message,
        modifiedCount: result.modifiedCount,
      });
    } else {
      res.status(404).json({ message: "Không có sinh viên nào được cập nhật" });
    }
  } catch (error) {
    console.error("Lỗi cập nhật đồng loạt ngày ra trường:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

const getExcelPoliticalManagement = async (req, res) => {
  try {
    const { schoolYear } = req.query;

    if (!schoolYear) {
      return res.status(400).json({
        success: false,
        message: "Năm học không được để trống",
      });
    }

    // Sử dụng logic lọc giống như frontend
    const startYear = parseInt(schoolYear.split("-")[0]);

    // Query giống như trong getStudents
    const query = {
      $and: [
        { enrollment: { $lte: startYear } }, // Vào trước/đúng startYear
        {
          $or: [
            { graduationDate: { $exists: false } },
            { graduationDate: null },
            { graduationDate: { $gt: new Date(startYear, 11, 31) } }, // Chưa ra trường hoặc ra trường sau 31/12/startYear
          ],
        },
      ],
    };

    console.log(`=== DEBUG: Tìm kiếm sinh viên cho năm học ${schoolYear} ===`);
    console.log(`- Start Year: ${startYear}`);
    console.log(`- Query:`, JSON.stringify(query, null, 2));

    const students = await Student.find(query)
      .populate("university", "universityName")
      .populate("organization", "organizationName")
      .populate("educationLevel", "levelName")
      .populate("class", "className")
      .populate("achievement")
      .sort({ studentId: 1 });

    console.log(
      `Tìm thấy ${students.length} sinh viên cho năm học ${schoolYear}`
    );

    // Log chi tiết từng sinh viên
    students.forEach((student, index) => {
      console.log(`\n--- Sinh viên ${index + 1}: ${student.fullName} ---`);
      console.log(`- Student ID: ${student.studentId}`);
      console.log(`- Enrollment: ${student.enrollment}`);
      console.log(
        `- Graduation Date: ${student.graduationDate || "Chưa ra trường"}`
      );
      console.log(`- Unit: ${student.unit}`);
    });

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy sinh viên nào trong năm học ${schoolYear}. Sinh viên phải vào trước/đúng năm ${startYear} và chưa ra trường hoặc ra trường sau 31/12/${startYear}`,
      });
    }

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Quản lý chính trị nội bộ");

    worksheet.properties.defaultRowHeight = 25;

    const titleRow = worksheet.addRow([
      `Quản lý chính trị nội bộ Hệ học viên 5 - Năm học ${schoolYear}`,
    ]);
    titleRow.height = 30;
    worksheet.mergeCells("A1:U1");
    titleRow.getCell(1).font = {
      name: "Times New Roman",
      size: 14,
      bold: true,
    };
    titleRow.getCell(1).alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    worksheet.addRow([]);

    const headerRow1 = worksheet.addRow([
      "STT",
      "Đơn vị",
      "Họ tên\nNgày sinh\nQuê quán\nNơi ở hiện nay",
      "Cấp bậc",
      "Gia đình",
      "Nhập ngũ",
      "Dân tộc",
      "Tôn giáo",
      "Mối quan hệ có yếu tố nước ngoài",
      "Đảng",
      "",
      "Xếp loại Đảng viên",
      "",
      "",
      "",
      "Khen thưởng",
      "",
      "",
      "",
      "Xếp loại rèn luyện",
    ]);

    const headerRow2 = worksheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Vào Đảng",
      "Chính thức",
      "Tốt",
      "Hoàn thành",
      "Không hoàn thành",
      "Xuất sắc",
      "CSTT",
      "CSTĐ",
      "BK BQP",
      "CSTĐ TQ",
      "Xếp loại rèn luyện",
    ]);

    worksheet.mergeCells("A3:A4");
    worksheet.mergeCells("B3:B4");
    worksheet.mergeCells("C3:C4");
    worksheet.mergeCells("D3:D4");
    worksheet.mergeCells("E3:E4");
    worksheet.mergeCells("F3:F4");
    worksheet.mergeCells("G3:G4");
    worksheet.mergeCells("H3:H4");
    worksheet.mergeCells("I3:I4");
    worksheet.mergeCells("J3:K3");
    worksheet.mergeCells("L3:O3");
    worksheet.mergeCells("P3:S3");
    worksheet.mergeCells("T3:T4");

    const headerStyle = {
      font: { name: "Times New Roman", size: 12, bold: true },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    headerRow1.eachCell((cell, colNumber) => {
      cell.font = headerStyle.font;
      cell.alignment = { ...headerStyle.alignment, wrapText: true };
      cell.border = headerStyle.border;
    });

    headerRow2.eachCell((cell, colNumber) => {
      cell.font = headerStyle.font;
      cell.alignment = { ...headerStyle.alignment, wrapText: true };
      cell.border = headerStyle.border;
    });

    // Sắp xếp sinh viên theo đơn vị từ L1-H5 đến L6-H5
    students.sort((a, b) => {
      const unitOrder = {
        "L1 - H5": 1,
        "L2 - H5": 2,
        "L3 - H5": 3,
        "L4 - H5": 4,
        "L5 - H5": 5,
        "L6 - H5": 6,
      };
      const unitA = unitOrder[a.unit] || 999;
      const unitB = unitOrder[b.unit] || 999;
      if (unitA !== unitB) return unitA - unitB;

      // Nếu cùng đơn vị, sắp xếp theo tên
      return a.fullName.localeCompare(b.fullName, "vi");
    });

    console.log("\n=== THỨ TỰ SẮP XẾP SINH VIÊN ===");
    students.forEach((student, index) => {
      console.log(`${index + 1}. ${student.fullName} - ${student.unit}`);
    });

    students.forEach((student, index) => {
      // Tìm yearlyResult cho năm học cụ thể
      let yearlyResult = student.yearlyResults.find(
        (yr) => yr.schoolYear === schoolYear
      );

      // Nếu không tìm thấy, lấy yearlyResult gần nhất
      if (!yearlyResult && student.yearlyResults.length > 0) {
        yearlyResult = student.yearlyResults.sort((a, b) =>
          b.schoolYear.localeCompare(a.schoolYear)
        )[0];
        console.log(
          `⚠️ Không tìm thấy yearlyResult cho ${schoolYear}, sử dụng ${yearlyResult.schoolYear}`
        );
      }

      const achievement = student.achievement;

      console.log(`\n--- Sinh viên ${index + 1}: ${student.fullName} ---`);
      console.log(`- Yearly Result cho ${schoolYear}:`, yearlyResult);
      console.log(`- Achievement:`, achievement);
      console.log(`- Party Rating:`, yearlyResult?.partyRating);
      console.log(`- Training Rating:`, yearlyResult?.trainingRating);

      const familyInfo = student.familyMembers
        .map(
          (member) =>
            `${member.relationship}: ${member.fullName}, ${new Date(
              member.birthday
            ).getFullYear()}, ${member.occupation}`
        )
        .join("; ");

      const foreignInfo = student.foreignRelations
        .map(
          (relation) =>
            `${relation.relationship}: ${relation.fullName}, ${relation.country}. ${relation.reason}, Quốc tịch: ${relation.nationality}`
        )
        .join("\n");

      const partyJoinDate = student.probationaryPartyMember
        ? new Date(student.probationaryPartyMember).toLocaleDateString("vi-VN")
        : "Chưa có dữ liệu";
      const partyOfficialDate = student.fullPartyMember
        ? new Date(student.fullPartyMember).toLocaleDateString("vi-VN")
        : "Chưa có dữ liệu";

      const partyRating = yearlyResult?.partyRating?.rating || "";
      const trainingRating = yearlyResult?.trainingRating || "";

      console.log(`- Thông tin Đảng:`);
      console.log(
        `  + Vào Đảng: ${student.probationaryPartyMember} -> ${partyJoinDate}`
      );
      console.log(
        `  + Chính thức: ${student.fullPartyMember} -> ${partyOfficialDate}`
      );
      console.log(`  + Xếp loại Đảng viên: ${partyRating}`);
      console.log(`  + Xếp loại rèn luyện: ${trainingRating}`);

      let cstt = "",
        cstd = "",
        bkBqp = "",
        cstdTq = "";

      console.log(`- Yearly Achievements:`, achievement?.yearlyAchievements);

      if (achievement && achievement.yearlyAchievements) {
        const targetYear = parseInt(schoolYear.split("-")[0]);
        let currentYearAchievement = achievement.yearlyAchievements.find(
          (ya) => ya.year === targetYear
        );

        // Nếu không tìm thấy achievement cho năm cụ thể, lấy năm gần nhất
        if (
          !currentYearAchievement &&
          achievement.yearlyAchievements.length > 0
        ) {
          currentYearAchievement = achievement.yearlyAchievements.sort(
            (a, b) => b.year - a.year
          )[0];
          console.log(
            `⚠️ Không tìm thấy achievement cho năm ${targetYear}, sử dụng năm ${currentYearAchievement.year}`
          );
        }

        console.log(
          `- Current Year Achievement (${targetYear}):`,
          currentYearAchievement
        );

        if (currentYearAchievement) {
          if (currentYearAchievement.title === "Chiến sĩ tiên tiến") cstt = "X";
          if (currentYearAchievement.title === "Chiến sĩ thi đua") cstd = "X";
          if (currentYearAchievement.hasMinistryReward) bkBqp = "X";
          if (currentYearAchievement.hasNationalReward) cstdTq = "X";
        }
      }

      console.log(
        `- Khen thưởng: CSTT=${cstt}, CSTĐ=${cstd}, BK BQP=${bkBqp}, CSTĐ TQ=${cstdTq}`
      );

      // Tạo thông tin cá nhân với xuống dòng
      const personalInfo = `${student.fullName}\n${
        student.birthday
          ? new Date(student.birthday).toLocaleDateString("vi-VN")
          : ""
      }\n${student.hometown || ""}\n${student.currentAddress || ""}`;

      // Ngày nhập ngũ (ngày vào trường)
      const enlistmentDate = student.enrollment
        ? `01/09/${student.enrollment}`
        : "Chưa có dữ liệu";

      const dataRow = worksheet.addRow([
        index + 1,
        student.unit || "",
        personalInfo,
        student.rank || "",
        familyInfo,
        enlistmentDate,
        student.ethnicity || "",
        student.religion || "Không",
        foreignInfo,
        partyJoinDate,
        partyOfficialDate,
        partyRating === "HTXSNV" ? "X" : "",
        partyRating === "HTTNV" ? "X" : "",
        partyRating === "KHTNV" ? "X" : "",
        partyRating === "HTXSNV" ? "X" : "", // Xuất sắc
        cstt,
        cstd,
        bkBqp,
        cstdTq,
        trainingRating,
      ]);

      dataRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Times New Roman", size: 12 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = headerStyle.border;
      });

      dataRow.getCell(3).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
      dataRow.getCell(5).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
      dataRow.getCell(9).alignment = {
        horizontal: "left",
        vertical: "middle",
        wrapText: true,
      };
    });

    worksheet.columns = [
      { width: 5 }, // STT
      { width: 10 }, // Đơn vị
      { width: 35 }, // Họ tên/Ngày sinh/Quê quán/Nơi ở
      { width: 12 }, // Cấp bậc
      { width: 30 }, // Gia đình
      { width: 12 }, // Nhập ngũ
      { width: 10 }, // Dân tộc
      { width: 10 }, // Tôn giáo
      { width: 25 }, // Mối quan hệ có yếu tố nước ngoài
      { width: 12 }, // Vào Đảng
      { width: 12 }, // Chính thức
      { width: 8 }, // Tốt
      { width: 12 }, // Hoàn thành
      { width: 15 }, // Không hoàn thành
      { width: 10 }, // Xuất sắc
      { width: 8 }, // CSTT
      { width: 8 }, // CSTĐ
      { width: 8 }, // BK BQP
      { width: 8 }, // CSTĐ TQ
      { width: 15 }, // Xếp loại rèn luyện
    ];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quan-ly-chinh-tri-noi-bo-${schoolYear}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Lỗi khi xuất Excel quản lý chính trị nội bộ:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xuất file Excel",
    });
  }
};

const getAvailableSchoolYearsForPoliticalManagement = async (req, res) => {
  try {
    const allStudents = await Student.find({});

    const schoolYears = new Set();

    allStudents.forEach((student) => {
      // Lấy từ yearlyResults
      if (student.yearlyResults && student.yearlyResults.length > 0) {
        student.yearlyResults.forEach((yr) => {
          if (yr.schoolYear) {
            schoolYears.add(yr.schoolYear);
          }
        });
      }

      // Lấy từ enrollment year
      if (student.enrollment) {
        const enrollmentYear = student.enrollment.toString();
        schoolYears.add(`${enrollmentYear}-${parseInt(enrollmentYear) + 1}`);
      }
    });

    const sortedSchoolYears = Array.from(schoolYears).sort().reverse();

    res.json({
      success: true,
      schoolYears: sortedSchoolYears,
      totalStudents: allStudents.length,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách năm học:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách năm học",
    });
  }
};

const getExcelTimeTableWithCutRice = async (req, res) => {
  try {
    const { unit } = req.query;

    // Sử dụng API có sẵn để lấy dữ liệu lịch học (đã được xử lý sẵn)
    const timeTableQuery = unit ? { unit } : {};
    const timeTableData = await TimeTable.find(timeTableQuery)
      .populate({
        path: "studentId",
        select: "fullName unit university organization educationLevel",
        populate: [
          { path: "university", select: "universityName" },
          { path: "organization", select: "organizationName travelTime" },
          { path: "educationLevel", select: "levelName" },
        ],
      })
      .sort({ unit: 1, "studentId.fullName": 1 });

    // Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Thời khóa biểu");

    // 1) Tiêu đề chính - đưa lên hàng 1, hàng 2 trống
    worksheet.mergeCells("A1:J1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Thời khóa biểu năm học 2024-2025";
    titleCell.font = { name: "Times New Roman", size: 14, bold: true };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };

    // 2) Thêm một dòng trống ở hàng 2
    worksheet.addRow([]);

    // 3) Header row 3 (nhóm lớn)
    const headerRow3 = worksheet.addRow([
      "STT",
      "Đơn vị",
      "Họ tên",
      "Thứ",
      "Lịch học",
      "",
      "",
      "Cắt cơm",
      "",
      "",
    ]);

    // 4) Header row 4 (subheaders)
    const headerRow4 = worksheet.addRow([
      "",
      "",
      "",
      "",
      "Môn học",
      "Thời gian",
      "Địa điểm",
      "Sáng",
      "Trưa",
      "Chiều",
    ]);

    // 5) Merge cells theo yêu cầu
    worksheet.mergeCells("A3:A4"); // STT
    worksheet.mergeCells("B3:B4"); // Đơn vị
    worksheet.mergeCells("C3:C4"); // Họ tên
    worksheet.mergeCells("D3:D4"); // Thứ
    worksheet.mergeCells("E3:G3"); // Lịch học
    worksheet.mergeCells("H3:J3"); // Cắt cơm

    // 6) Set column widths
    worksheet.columns = [
      { width: 6 }, // A: STT
      { width: 12 }, // B: Đơn vị
      { width: 36 }, // C: Họ tên
      { width: 6 }, // D: Thứ
      { width: 28 }, // E: Môn học
      { width: 16 }, // F: Thời gian
      { width: 12 }, // G: Địa điểm
      { width: 8 }, // H: Sáng
      { width: 8 }, // I: Trưa
      { width: 8 }, // J: Chiều
    ];

    // 7) Style cho headers
    const headerStyle = {
      font: { name: "Times New Roman", size: 12, bold: true },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // Set row heights cho header (độ cao hợp lý)
    worksheet.getRow(3).height = 20; // Header chính
    worksheet.getRow(4).height = 18; // Subheader

    headerRow3.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    headerRow4.eachCell((cell) => {
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    // Nhóm dữ liệu theo sinh viên - bao gồm cả sinh viên chỉ có lịch cắt cơm
    const studentsMap = new Map();

    // Xử lý dữ liệu lịch học
    timeTableData.forEach((item) => {
      const key = String(item.studentId._id);
      if (!studentsMap.has(key)) {
        studentsMap.set(key, {
          studentId: key,
          fullName: item.studentId.fullName,
          unit: item.studentId.unit,
          university: item.studentId.university,
          organization: item.studentId.organization,
          educationLevel: item.studentId.educationLevel,
          schedules: [],
          cutRice: null,
        });
      }

      // Thêm tất cả schedules từ item.schedules - chuyển đổi thành plain object
      if (item.schedules && item.schedules.length > 0) {
        item.schedules.forEach((schedule) => {
          // Chuyển đổi Mongoose subdocument thành plain object
          const plainSchedule = schedule.toObject
            ? schedule.toObject()
            : schedule;
          studentsMap.get(key).schedules.push({
            ...plainSchedule,
            studentId: key,
            fullName: item.studentId.fullName,
            unit: item.studentId.unit,
          });
        });
      }
    });

    // Không thêm sinh viên chỉ có lịch cắt cơm (chỉ xử lý sinh viên có lịch học)

    // Xử lý dữ liệu cắt cơm - gọi API getAllCutRice

    // Gọi function getAllCutRice để lấy dữ liệu cắt cơm
    try {
      // Tạo mock request object
      const mockReq = {
        query: unit ? { unit } : {},
      };

      // Tạo mock response object
      let cutRices = [];
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            cutRices = data;

            return mockRes;
          },
        }),
      };

      // Gọi function getAllCutRice
      await getAllCutRice(mockReq, mockRes);

      // Gán dữ liệu cắt cơm cho sinh viên trong studentsMap
      let assignedCount = 0;
      cutRices.forEach((cutRice) => {
        const sid = String(cutRice.studentId);

        if (studentsMap.has(sid)) {
          studentsMap.get(sid).cutRice = cutRice;
          assignedCount++;
        } else {
        }
      });
    } catch (error) {}

    // Lọc và sắp xếp sinh viên - chỉ hiển thị sinh viên có lịch học
    const students = Array.from(studentsMap.values())
      .filter((student) => student.schedules.length > 0) // Chỉ lấy sinh viên có lịch học
      .sort((a, b) => {
        const unitOrder = {
          "L1 - H5": 1,
          "L2 - H5": 2,
          "L3 - H5": 3,
          "L4 - H5": 4,
          "L5 - H5": 5,
          "L6 - H5": 6,
        };
        const unitA = unitOrder[a.unit] || 999;
        const unitB = unitOrder[b.unit] || 999;
        if (unitA !== unitB) return unitA - unitB;
        return a.fullName.localeCompare(b.fullName, "vi");
      });

    let rowIndex = 5; // Dữ liệu bắt đầu từ row 5
    let studentIndex = 1;

    students.forEach((student) => {
      // Sắp xếp lịch học theo thứ
      const dayOrder = {
        "Thứ 2": 1,
        "Thứ 3": 2,
        "Thứ 4": 3,
        "Thứ 5": 4,
        "Thứ 6": 5,
        "Thứ 7": 6,
        "Chủ nhật": 7,
      };
      student.schedules.sort(
        (a, b) => (dayOrder[a.day] || 999) - (dayOrder[b.day] || 999)
      );

      const startRowIndex = rowIndex;

      // Chỉ xử lý sinh viên có lịch học (không tạo fake schedules)

      // Nhóm nhiều môn cùng một "Thứ" và gộp cột Thứ + Cắt cơm
      let scheduleIndex = 0;
      while (scheduleIndex < student.schedules.length) {
        const groupDay = student.schedules[scheduleIndex].day || "";
        const groupStartRow = rowIndex;

        // Tính độ dài nhóm cùng ngày
        let j = scheduleIndex;
        while (
          j < student.schedules.length &&
          (student.schedules[j].day || "") === groupDay
        ) {
          j++;
        }
        const groupEndExclusive = j; // không bao gồm j

        // Sắp xếp các môn trong cùng một ngày theo thời gian bắt đầu tăng dần
        const getStartMinutes = (timeStr) => {
          if (!timeStr || typeof timeStr !== "string") return 24 * 60;
          // Định dạng kỳ vọng: "HH:MM - HH:MM"
          const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
          if (!match) return 24 * 60;
          const hour = parseInt(match[1], 10);
          const minute = parseInt(match[2], 10);
          return hour * 60 + minute;
        };
        const groupSchedules = student.schedules
          .slice(scheduleIndex, groupEndExclusive)
          .sort((a, b) => getStartMinutes(a.time) - getStartMinutes(b.time));

        // Tính cắt cơm cho ngày này (ghi một lần cho cả nhóm)
        let cutRiceForDay = { breakfast: "", lunch: "", dinner: "" };
        if (student.cutRice && groupDay) {
          const dayKey = groupDay.toLowerCase().replace(" ", "");
          const dayMapping = {
            thứ2: "monday",
            thứ3: "tuesday",
            thứ4: "wednesday",
            thứ5: "thursday",
            thứ6: "friday",
            thứ7: "saturday",
            chủnhật: "sunday",
          };
          const day = dayMapping[dayKey];
          if (day && typeof student.cutRice === "object") {
            const source = Array.isArray(student.cutRice)
              ? student.cutRice[0]
              : student.cutRice;
            if (source && source[day]) {
              cutRiceForDay.breakfast = source[day].breakfast ? "X" : "";
              cutRiceForDay.lunch = source[day].lunch ? "X" : "";
              cutRiceForDay.dinner = source[day].dinner ? "X" : "";
            }
          }
        }

        // Ghi từng môn trong nhóm
        for (let idx = 0; idx < groupSchedules.length; idx++) {
          const schedule = groupSchedules[idx];
          const isFirstInGroup = idx === 0;

          let studentInfo = "";
          if (isFirstInGroup) {
            console.log("student123", student);
            const universityName =
              typeof student.university === "object" &&
              student.university?.universityName
                ? student.university.universityName
                : "Chưa có thông tin";
            const major =
              typeof student.educationLevel === "object" &&
              student.educationLevel?.levelName
                ? student.educationLevel.levelName
                : "Chưa có thông tin";
            const organizationName =
              typeof student.organization === "object" &&
              student.organization?.organizationName
                ? student.organization.organizationName
                : "Chưa có lớp";
            const travelTime =
              typeof student.organization === "object" &&
              student.organization?.travelTime
                ? student.organization.travelTime + " phút"
                : "Chưa có thời gian di chuyển";
            studentInfo = `${student.fullName}\nTrình độ: ${major}\nTrường: ${universityName}\nKhoa/Viện: ${organizationName}\nThời gian di chuyển: ${travelTime}`;
          }

          // Giá trị số cho cột "Thứ" để Excel hiểu là số
          const dayNumberMap = {
            "Thứ 2": 2,
            "Thứ 3": 3,
            "Thứ 4": 4,
            "Thứ 5": 5,
            "Thứ 6": 6,
            "Thứ 7": 7,
            "Chủ nhật": 8,
          };
          const dayNumber = dayNumberMap[groupDay] ?? null;

          const rowData = [
            isFirstInGroup && scheduleIndex === 0
              ? studentIndex
              : isFirstInGroup
              ? ""
              : "",
            isFirstInGroup ? student.unit : "",
            isFirstInGroup ? studentInfo : "",
            isFirstInGroup ? dayNumber : "",
            schedule.subject || "",
            schedule.time || "",
            schedule.classroom || "",
            isFirstInGroup ? cutRiceForDay.breakfast : "",
            isFirstInGroup ? cutRiceForDay.lunch : "",
            isFirstInGroup ? cutRiceForDay.dinner : "",
          ];

          const row = worksheet.addRow(rowData);
          const rowHeight = isFirstInGroup ? 35 : 20;
          worksheet.getRow(rowIndex).height = rowHeight;

          row.eachCell((cell, colNumber) => {
            cell.font = { name: "Times New Roman", size: 12 };
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            if (colNumber === 1 || colNumber === 2 || colNumber === 4) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            } else if (colNumber === 3) {
              cell.alignment = {
                horizontal: "left",
                vertical: "top",
                wrapText: true,
              };
            } else if (
              colNumber === 6 ||
              colNumber === 7 ||
              colNumber === 8 ||
              colNumber === 9 ||
              colNumber === 10
            ) {
              cell.alignment = { horizontal: "center", vertical: "middle" };
            } else {
              cell.alignment = { horizontal: "left", vertical: "middle" };
            }
          });

          rowIndex++;
        }

        // Gộp cột Thứ và cột Cắt cơm cho nhóm
        if (groupEndExclusive - scheduleIndex > 1) {
          const groupEndRow = rowIndex - 1;
          worksheet.mergeCells(`D${groupStartRow}:D${groupEndRow}`); // Thứ
          worksheet.mergeCells(`H${groupStartRow}:H${groupEndRow}`); // Sáng
          worksheet.mergeCells(`I${groupStartRow}:I${groupEndRow}`); // Trưa
          worksheet.mergeCells(`J${groupStartRow}:J${groupEndRow}`); // Chiều
        }

        scheduleIndex = groupEndExclusive;
      }

      // Merge cells cho thông tin sinh viên
      if (student.schedules.length > 1) {
        const endRowIndex = rowIndex - 1;
        worksheet.mergeCells(`A${startRowIndex}:A${endRowIndex}`); // STT
        worksheet.mergeCells(`B${startRowIndex}:B${endRowIndex}`); // Đơn vị
        worksheet.mergeCells(`C${startRowIndex}:C${endRowIndex}`); // Họ tên
      }

      studentIndex++;
    });

    // Log tổng quan về dữ liệu cắt cơm

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=thoikhoabieu.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo file Excel",
    });
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
  getTopStudentsByLatestYear,
  getTopStudentsByLatestSemester,
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
  getExcelCutRiceWithSchedule,
  updateStudentRating,
  getAvailableYears,
  getYearlyResults,
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
};
