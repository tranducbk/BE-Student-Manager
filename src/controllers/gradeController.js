const User = require("../models/user");
const gradeHelper = require("../helpers/gradeHelper");

// Lấy kết quả học tập của sinh viên
const getStudentGrades = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const semesterResults = user.student.semesterResults || [];

    // Cập nhật điểm tích lũy
    if (semesterResults.length > 0) {
      gradeHelper.updateCumulativeGrades(semesterResults);
    }

    return res.status(200).json({
      studentId: user.student.studentId,
      fullName: user.student.fullName,
      semesterResults,
      summary: {
        totalSemesters: semesterResults.length,
        totalCredits: gradeHelper.calculateCumulativeCredits(semesterResults),
        cumulativeGrade4:
          gradeHelper.calculateCumulativeGrade4(semesterResults),
        cumulativeGrade10:
          gradeHelper.calculateCumulativeGrade10(semesterResults),
      },
    });
  } catch (error) {
    console.error("Error getting student grades:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy kết quả học tập theo học kỳ
const getSemesterGrades = async (req, res) => {
  try {
    const { userId, semester, schoolYear } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const semesterResults = user.student.semesterResults || [];

    // Đảm bảo semester là string format "HK1", "HK2", "HK3"
    const formattedSemester = gradeHelper.formatSemester(semester);

    const targetSemester = semesterResults.find((result) => {
      // Chuyển đổi result.semester cũ thành format mới nếu cần
      const resultSemester = gradeHelper.formatSemester(result.semester);

      return (
        resultSemester === formattedSemester && result.schoolYear === schoolYear
      );
    });

    if (!targetSemester) {
      return res.status(404).json({
        message: `Không tìm thấy kết quả học tập cho học kỳ ${semester} năm ${schoolYear}`,
      });
    }

    // Cập nhật kết quả học kỳ
    gradeHelper.updateSemesterResult(targetSemester);

    return res.status(200).json(targetSemester);
  } catch (error) {
    console.error("Error getting semester grades:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm kết quả học tập cho học kỳ
const addSemesterGrades = async (req, res) => {
  try {
    const { userId } = req.params;
    const { semester, schoolYear, subjects } = req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Validate dữ liệu
    if (!semester || !schoolYear || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    // Đảm bảo semester là string format "HK1", "HK2", "HK3"
    const formattedSemester = gradeHelper.formatSemester(semester);

    // Kiểm tra học kỳ đã tồn tại chưa (xử lý cả dữ liệu cũ)
    const existingSemester = user.student.semesterResults.find((result) => {
      // Chuyển đổi result.semester cũ thành format mới nếu cần
      const resultSemester = gradeHelper.formatSemester(result.semester);

      return (
        resultSemester === formattedSemester && result.schoolYear === schoolYear
      );
    });

    if (existingSemester) {
      return res.status(400).json({
        message: `Kết quả học tập cho học kỳ ${semester} năm ${schoolYear} đã tồn tại`,
      });
    }

    // Tạo kết quả môn học từ dữ liệu đầu vào
    const processedSubjects = subjects.map((subject) => {
      const { subjectCode, subjectName, credits, gradePoint10 } = subject;

      // Validate điểm hệ 10
      const grade10 = parseFloat(gradePoint10);
      if (isNaN(grade10) || grade10 < 0 || grade10 > 10) {
        throw new Error(`Điểm hệ 10 không hợp lệ: ${gradePoint10}`);
      }

      // Tính điểm chữ từ điểm hệ 10
      const letterGrade = gradeHelper.grade10ToLetter(grade10);

      // Tính điểm hệ 4 từ điểm chữ
      const gradePoint4 = gradeHelper.letterToGrade4(letterGrade);

      return {
        subjectCode,
        subjectName,
        credits,
        letterGrade,
        gradePoint4,
        gradePoint10,
      };
    });

    // Tạo kết quả học kỳ mới
    const newSemesterResult = {
      semester: formattedSemester,
      schoolYear,
      subjects: processedSubjects,
      totalCredits: gradeHelper.calculateTotalCredits(processedSubjects),
      averageGrade4: gradeHelper.calculateAverageGrade4(processedSubjects),
      averageGrade10: gradeHelper.calculateAverageGrade10(processedSubjects),
      cumulativeCredits: 0,
      cumulativeGrade4: 0,
      cumulativeGrade10: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Thêm vào danh sách kết quả học tập
    if (!user.student.semesterResults) {
      user.student.semesterResults = [];
    }

    user.student.semesterResults.push(newSemesterResult);

    // Cập nhật điểm tích lũy cho tất cả học kỳ
    gradeHelper.updateCumulativeGrades(user.student.semesterResults);

    await user.student.save();

    return res.status(201).json({
      message: "Thêm kết quả học tập thành công",
      semesterResult: newSemesterResult,
    });
  } catch (error) {
    console.error("Error adding semester grades:", error);
    return res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

// Cập nhật kết quả học tập cho học kỳ
const updateSemesterGrades = async (req, res) => {
  try {
    const { userId, semester, schoolYear } = req.params;
    const { subjects } = req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Đảm bảo semester là string format "HK1", "HK2", "HK3"
    const formattedSemester = gradeHelper.formatSemester(semester);

    // Tìm học kỳ cần cập nhật (xử lý cả dữ liệu cũ)
    const semesterIndex = user.student.semesterResults.findIndex((result) => {
      // Chuyển đổi result.semester cũ thành format mới nếu cần
      const resultSemester = gradeHelper.formatSemester(result.semester);

      return (
        resultSemester === formattedSemester && result.schoolYear === schoolYear
      );
    });

    if (semesterIndex === -1) {
      return res.status(404).json({
        message: `Không tìm thấy kết quả học tập cho học kỳ ${semester} năm ${schoolYear}`,
      });
    }

    // Xử lý dữ liệu môn học
    const processedSubjects = subjects.map((subject) => {
      const { subjectCode, subjectName, credits, gradePoint10 } = subject;

      // Validate điểm hệ 10
      const grade10 = parseFloat(gradePoint10);
      if (isNaN(grade10) || grade10 < 0 || grade10 > 10) {
        throw new Error(`Điểm hệ 10 không hợp lệ: ${gradePoint10}`);
      }

      // Tính điểm chữ từ điểm hệ 10
      const letterGrade = gradeHelper.grade10ToLetter(grade10);

      // Tính điểm hệ 4 từ điểm chữ
      const gradePoint4 = gradeHelper.letterToGrade4(letterGrade);

      return {
        subjectCode,
        subjectName,
        credits,
        letterGrade,
        gradePoint4,
        gradePoint10,
      };
    });

    // Cập nhật kết quả học kỳ
    user.student.semesterResults[semesterIndex].subjects = processedSubjects;
    user.student.semesterResults[semesterIndex].totalCredits =
      gradeHelper.calculateTotalCredits(processedSubjects);
    user.student.semesterResults[semesterIndex].averageGrade4 =
      gradeHelper.calculateAverageGrade4(processedSubjects);
    user.student.semesterResults[semesterIndex].averageGrade10 =
      gradeHelper.calculateAverageGrade10(processedSubjects);
    user.student.semesterResults[semesterIndex].updatedAt = new Date();

    // Cập nhật điểm tích lũy cho tất cả học kỳ
    gradeHelper.updateCumulativeGrades(user.student.semesterResults);

    await user.student.save();

    return res.status(200).json({
      message: "Cập nhật kết quả học tập thành công",
      semesterResult: user.student.semesterResults[semesterIndex],
    });
  } catch (error) {
    console.error("Error updating semester grades:", error);
    return res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

// Xóa kết quả học tập cho học kỳ
const deleteSemesterGrades = async (req, res) => {
  try {
    const { userId, semester, schoolYear } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Đảm bảo semester là string format "HK1", "HK2", "HK3"
    const formattedSemester = gradeHelper.formatSemester(semester);

    // Tìm và xóa học kỳ (xử lý cả dữ liệu cũ)
    const semesterIndex = user.student.semesterResults.findIndex((result) => {
      // Chuyển đổi result.semester cũ thành format mới nếu cần
      const resultSemester = gradeHelper.formatSemester(result.semester);

      return (
        resultSemester === formattedSemester && result.schoolYear === schoolYear
      );
    });

    if (semesterIndex === -1) {
      return res.status(404).json({
        message: `Không tìm thấy kết quả học tập cho học kỳ ${semester} năm ${schoolYear}`,
      });
    }

    user.student.semesterResults.splice(semesterIndex, 1);

    // Cập nhật điểm tích lũy cho tất cả học kỳ còn lại
    if (user.student.semesterResults.length > 0) {
      gradeHelper.updateCumulativeGrades(user.student.semesterResults);
    }

    await user.student.save();

    return res.status(200).json({
      message: "Xóa kết quả học tập thành công",
    });
  } catch (error) {
    console.error("Error deleting semester grades:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thông tin điểm
const getGradeInfo = async (req, res) => {
  try {
    const { letterGrade } = req.params;

    const gradeInfo = gradeHelper.getGradeInfo(letterGrade);

    if (!gradeInfo) {
      return res.status(400).json({ message: "Điểm chữ không hợp lệ" });
    }

    return res.status(200).json(gradeInfo);
  } catch (error) {
    console.error("Error getting grade info:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Chuyển đổi điểm
const convertGrade = async (req, res) => {
  try {
    const { fromType, toType, value } = req.body;

    if (!fromType || !toType || value === undefined) {
      return res.status(400).json({ message: "Thiếu thông tin chuyển đổi" });
    }

    let result = null;

    switch (fromType) {
      case "letter":
        if (toType === "grade4") {
          result = gradeHelper.letterToGrade4(value);
        } else if (toType === "grade10") {
          result = gradeHelper.letterToGrade10(value);
        }
        break;
      case "grade4":
        if (toType === "letter") {
          result = gradeHelper.grade4ToLetter(parseFloat(value));
        } else if (toType === "grade10") {
          result = gradeHelper.grade4ToGrade10(parseFloat(value));
        }
        break;
      case "grade10":
        if (toType === "letter") {
          result = gradeHelper.grade10ToLetter(parseFloat(value));
        } else if (toType === "grade4") {
          result = gradeHelper.grade10ToGrade4(parseFloat(value));
        }
        break;
      default:
        return res.status(400).json({ message: "Loại điểm không hợp lệ" });
    }

    if (result === null) {
      return res.status(400).json({ message: "Không thể chuyển đổi điểm" });
    }

    return res.status(200).json({
      fromType,
      toType,
      fromValue: value,
      toValue: result,
    });
  } catch (error) {
    console.error("Error converting grade:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tính điểm trung bình
const calculateAverage = async (req, res) => {
  try {
    const { grades, gradeType } = req.body;

    if (!grades || !Array.isArray(grades) || !gradeType) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    let average = 0;

    if (gradeType === "grade4") {
      average = gradeHelper.calculateAverageFromGrade4(grades);
    } else if (gradeType === "grade10") {
      average = gradeHelper.calculateAverageFromGrade10(grades);
    } else {
      return res.status(400).json({ message: "Loại điểm không hợp lệ" });
    }

    return res.status(200).json({
      grades,
      gradeType,
      average: average.toFixed(2),
    });
  } catch (error) {
    console.error("Error calculating average:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getStudentGrades,
  getSemesterGrades,
  addSemesterGrades,
  updateSemesterGrades,
  deleteSemesterGrades,
  getGradeInfo,
  convertGrade,
  calculateAverage,
};
