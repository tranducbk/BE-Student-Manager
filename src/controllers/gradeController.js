const User = require("../models/user");
const gradeHelper = require("../helpers/gradeHelper");
const Student = require("../models/student"); // Added import for Student model

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

    const cumulativeGrade4 =
      gradeHelper.calculateCumulativeGrade4(semesterResults);
    const cumulativeGrade10 =
      gradeHelper.calculateCumulativeGrade10(semesterResults);

    // Tính CPA hệ 10 từ CPA hệ 4
    const cumulativeGrade10FromCpa4 = (() => {
      if (cumulativeGrade4 < 2.0) return 0.0;
      if (cumulativeGrade4 < 2.5)
        return Math.min(10.0, 3.0 * cumulativeGrade4 - 0.5);
      if (cumulativeGrade4 < 3.2)
        return Math.min(10.0, 1.42 * cumulativeGrade4 + 3.45);
      return Math.min(10.0, 2.5 * cumulativeGrade4 + 0.0);
    })();

    return res.status(200).json({
      studentId: user.student.studentId,
      fullName: user.student.fullName,
      positionParty: user.student.positionParty,
      semesterResults,
      yearlyResults: user.student.yearlyResults || [],
      summary: {
        totalSemesters: semesterResults.length,
        totalCredits: gradeHelper.calculateCumulativeCredits(semesterResults),
        cumulativeGrade4: cumulativeGrade4,
        cumulativeGrade10: cumulativeGrade10,
        cumulativeGrade10FromCpa4: cumulativeGrade10FromCpa4,
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

// Lấy kết quả học tập theo học kỳ cho admin (sử dụng studentId)
const getSemesterGradesByStudentId = async (req, res) => {
  try {
    const { studentId, semester, schoolYear } = req.params;

    // Tìm student trực tiếp bằng studentId
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const semesterResults = student.semesterResults || [];

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
    console.error("Error getting semester grades by studentId:", error);
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
      yearlyResultId: null, // Sẽ được cập nhật sau khi tạo năm học
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

    // Tính toán lại CPA cho tất cả các năm học
    try {
      await recalculateAllYearlyResults(user.student);
    } catch (yearlyError) {
      console.error("Lỗi khi tính toán lại CPA:", yearlyError);
      // Vẫn tiếp tục lưu kết quả học kỳ ngay cả khi cập nhật năm học thất bại
    }

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

    // Tính toán lại CPA cho tất cả các năm học
    try {
      await recalculateAllYearlyResults(user.student);
    } catch (yearlyError) {
      console.error("Lỗi khi tính toán lại CPA:", yearlyError);
      // Vẫn tiếp tục lưu kết quả học kỳ ngay cả khi cập nhật năm học thất bại
    }

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

    const deletedSemester = user.student.semesterResults[semesterIndex];
    const deletedSemesterId = deletedSemester._id;

    user.student.semesterResults.splice(semesterIndex, 1);

    // Xóa ID học kỳ khỏi danh sách semesterIds trong năm học
    removeSemesterIdFromYearlyResult(
      user.student,
      deletedSemesterId,
      schoolYear
    );

    // Cập nhật điểm tích lũy cho tất cả học kỳ còn lại
    if (user.student.semesterResults.length > 0) {
      gradeHelper.updateCumulativeGrades(user.student.semesterResults);
    }

    // Cập nhật kết quả năm học sau khi xóa
    await updateYearlyResultsAfterDelete(user.student, schoolYear);

    await user.student.save();

    return res.status(200).json({
      message: "Xóa kết quả học tập thành công",
    });
  } catch (error) {
    console.error("Error deleting semester grades:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa kết quả học tập theo ID (để tương thích với frontend cũ)
const deleteSemesterGradesById = async (req, res) => {
  try {
    const { userId, learnId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tìm và xóa học kỳ theo _id
    const semesterIndex = user.student.semesterResults.findIndex(
      (result) => result._id.toString() === learnId
    );

    if (semesterIndex === -1) {
      return res.status(404).json({
        message: "Không tìm thấy kết quả học tập",
      });
    }

    // Lưu thông tin năm học trước khi xóa để cập nhật kết quả năm học
    const deletedSemester = user.student.semesterResults[semesterIndex];
    const schoolYear = deletedSemester.schoolYear;
    const deletedSemesterId = deletedSemester._id;

    user.student.semesterResults.splice(semesterIndex, 1);

    // Xóa ID học kỳ khỏi danh sách semesterIds trong năm học
    removeSemesterIdFromYearlyResult(
      user.student,
      deletedSemesterId,
      schoolYear
    );

    // Cập nhật điểm tích lũy cho tất cả học kỳ còn lại
    if (user.student.semesterResults.length > 0) {
      gradeHelper.updateCumulativeGrades(user.student.semesterResults);
    }

    // Tính toán lại CPA cho tất cả các năm học sau khi xóa
    // (vì CPA tích lũy bị ảnh hưởng khi xóa học kỳ)
    try {
      await recalculateAllYearlyResults(user.student);
    } catch (yearlyError) {
      console.error("Lỗi khi tính toán lại CPA sau khi xóa:", yearlyError);
    }

    await user.student.save();

    return res.status(200).json({
      message: "Xóa kết quả học tập thành công",
    });
  } catch (error) {
    console.error("Error deleting semester grades by ID:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tính toán lại CPA cho tất cả các năm học của sinh viên
const recalculateAllYearlyResultsAPI = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tính toán lại CPA cho tất cả các năm học
    await recalculateAllYearlyResults(user.student);

    // Lưu vào database
    await user.student.save();

    return res.status(200).json({
      message: "Đã tính toán lại CPA cho tất cả các năm học thành công",
      yearlyResults: user.student.yearlyResults,
    });
  } catch (error) {
    console.error("Error recalculating all yearly results:", error);
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

// Function tự động cập nhật kết quả năm học với mối quan hệ ID
const updateYearlyResults = async (student, schoolYear) => {
  try {
    console.log(
      `=== Bắt đầu cập nhật kết quả năm học ${schoolYear} cho sinh viên ${student.fullName} ===`
    );

    // Lấy tất cả kết quả học kỳ của năm học được chọn
    const semesterResults = student.semesterResults || [];
    const yearResults = semesterResults.filter(
      (result) => result.schoolYear === schoolYear
    );

    console.log(
      `Tìm thấy ${yearResults.length} học kỳ cho năm học ${schoolYear}`
    );
    console.log(`Tổng số học kỳ của sinh viên: ${semesterResults.length}`);
    console.log(
      `Danh sách tất cả học kỳ:`,
      semesterResults.map((s) => `${s.semester} - ${s.schoolYear}`)
    );

    if (yearResults.length === 0) {
      console.log(`Không có kết quả học kỳ nào cho năm học ${schoolYear}`);
      return;
    }

    // Tính toán GPA trung bình của năm học
    let totalCredits = 0;
    let totalGradePoints = 0;
    let totalGradePoints10 = 0;

    // Thu thập ID của các học kỳ thuộc năm học này
    const semesterIds = yearResults.map((result) => result._id);

    yearResults.forEach((result, index) => {
      console.log(
        `Học kỳ ${index + 1}: ${result.semester} - ${result.schoolYear} (ID: ${
          result._id
        })`
      );
      console.log(`  - Số môn học: ${result.subjects?.length || 0}`);
      console.log(`  - GPA học kỳ: ${result.averageGrade4 || 0}`);
      console.log(`  - Tổng tín chỉ học kỳ: ${result.totalCredits || 0}`);
      console.log(`  - Subjects:`, JSON.stringify(result.subjects, null, 2));

      if (result.subjects && result.subjects.length > 0) {
        result.subjects.forEach((subject, subIndex) => {
          const credits = subject.credits || 0;
          const gradePoint4 = subject.gradePoint4 || 0;
          const gradePoint10 = subject.gradePoint10 || 0;

          console.log(
            `    Môn ${subIndex + 1}: ${
              subject.subjectName
            } - ${credits} TC - ${gradePoint4} điểm hệ 4 - ${gradePoint10} điểm hệ 10`
          );

          totalCredits += credits;
          totalGradePoints += credits * gradePoint4;
          totalGradePoints10 += credits * gradePoint10;
        });
      } else {
        console.log(`    ⚠️ Học kỳ này không có môn học nào!`);
      }
    });

    const yearlyGPA =
      totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : "0.00";
    const yearlyGrade10 =
      totalCredits > 0
        ? (totalGradePoints10 / totalCredits).toFixed(2)
        : "0.00";

    // Tính toán CPA tích lũy (lấy từ kết quả cuối cùng của năm học)
    const lastResult = yearResults[yearResults.length - 1];
    const cumulativeGPA = lastResult.cumulativeGrade4?.toFixed(2) || "0.00";
    const cumulativeGrade10 =
      lastResult.cumulativeGrade10?.toFixed(2) || "0.00";
    const cumulativeCredits = lastResult.cumulativeCredits || 0;
    const totalDebt = lastResult.totalDebt || 0;
    const studentLevel = lastResult.studentLevel || 1;

    console.log(`Kết quả tính toán năm học ${schoolYear}:`);
    console.log(`  - Tổng tín chỉ: ${totalCredits}`);
    console.log(`  - GPA năm học (hệ 4): ${yearlyGPA}`);
    console.log(`  - GPA năm học (hệ 10): ${yearlyGrade10}`);
    console.log(`  - CPA tích lũy (hệ 4): ${cumulativeGPA}`);
    console.log(`  - CPA tích lũy (hệ 10): ${cumulativeGrade10}`);
    console.log(`  - Tổng tín chỉ tích lũy: ${cumulativeCredits}`);
    console.log(`  - Tổng tín chỉ nợ: ${totalDebt}`);
    console.log(`  - Năm học: ${studentLevel}`);
    console.log(`  - Danh sách ID học kỳ: ${semesterIds.join(", ")}`);

    // Tính thống kê môn học
    const allSubjects = yearResults.flatMap((result) => result.subjects || []);
    const totalSubjects = allSubjects.length;
    const passedSubjects = allSubjects.filter(
      (subject) => subject.letterGrade && subject.letterGrade !== "F"
    ).length;
    const failedSubjects = totalSubjects - passedSubjects;

    // Xác định trạng thái học tập
    let academicStatus = "Trung bình";
    if (parseFloat(yearlyGrade10) >= 8.0) academicStatus = "Tốt";
    else if (parseFloat(yearlyGrade10) >= 7.0) academicStatus = "Khá";
    else if (parseFloat(yearlyGrade10) >= 5.0) academicStatus = "Trung bình";
    else if (parseFloat(yearlyGrade10) >= 4.0) academicStatus = "Yếu";
    else academicStatus = "Kém";

    // Tạo hoặc cập nhật kết quả năm học với danh sách ID học kỳ
    const yearlyResult = {
      schoolYear: schoolYear,
      averageGrade4: parseFloat(yearlyGPA),
      averageGrade10: parseFloat(yearlyGrade10),
      cumulativeGrade4: parseFloat(cumulativeGPA),
      cumulativeGrade10: parseFloat(cumulativeGrade10),
      cumulativeCredits: cumulativeCredits,
      totalCredits: totalCredits,
      totalSubjects: totalSubjects,
      passedSubjects: passedSubjects,
      failedSubjects: failedSubjects,
      academicStatus: academicStatus,
      semesterCount: yearResults.length,
      semesterIds: semesterIds, // Lưu danh sách ID của các học kỳ
      updatedAt: new Date(),
    };

    // Kiểm tra xem đã có kết quả năm học chưa
    if (!student.yearlyResults) {
      student.yearlyResults = [];
    }

    const existingYearlyIndex = student.yearlyResults.findIndex(
      (result) => result.schoolYear === schoolYear
    );

    if (existingYearlyIndex !== -1) {
      // Cập nhật kết quả năm học hiện có
      console.log(`Cập nhật kết quả năm học hiện có cho năm ${schoolYear}`);
      student.yearlyResults[existingYearlyIndex] = {
        ...student.yearlyResults[existingYearlyIndex],
        ...yearlyResult,
      };
    } else {
      // Thêm kết quả năm học mới
      console.log(`Tạo mới kết quả năm học cho năm ${schoolYear}`);
      student.yearlyResults.push({
        ...yearlyResult,
        createdAt: new Date(),
      });
    }

    // Lưu vào database trước để có _id
    console.log(`Đang lưu dữ liệu vào database...`);
    await student.save();
    console.log(`Đã lưu thành công!`);

    // Sau khi lưu, cập nhật thông tin năm học cho tất cả học kỳ thuộc năm này
    const savedYearlyResult = student.yearlyResults.find(
      (result) => result.schoolYear === schoolYear
    );

    if (savedYearlyResult) {
      console.log(
        `Tìm thấy yearlyResult đã lưu với ID: ${savedYearlyResult._id}`
      );
      console.log(
        `Dữ liệu đã lưu:`,
        JSON.stringify(savedYearlyResult, null, 2)
      );

      yearResults.forEach((semester) => {
        semester.yearlyResultId = savedYearlyResult._id;
      });

      // Lưu lại để cập nhật yearlyResultId
      console.log(`Đang lưu lại để cập nhật yearlyResultId...`);
      await student.save();
      console.log(`Đã lưu lại thành công!`);
    } else {
      console.log(
        `❌ Không tìm thấy yearlyResult đã lưu cho năm ${schoolYear}`
      );
    }

    console.log(
      `=== Hoàn thành cập nhật kết quả năm học ${schoolYear} cho sinh viên ${student.fullName} ===`
    );
  } catch (error) {
    console.error("Error updating yearly results:", error);
    throw error; // Re-throw để xử lý ở function gọi
  }
};

// Function helper để cập nhật kết quả năm học sau khi xóa học kỳ
const updateYearlyResultsAfterDelete = async (student, schoolYear) => {
  try {
    // Kiểm tra xem còn học kỳ nào trong năm học không
    const remainingSemesters = student.semesterResults.filter(
      (result) => result.schoolYear === schoolYear
    );

    if (remainingSemesters.length === 0) {
      // Nếu không còn học kỳ nào, xóa kết quả năm học
      if (student.yearlyResults) {
        const yearlyIndex = student.yearlyResults.findIndex(
          (result) => result.schoolYear === schoolYear
        );
        if (yearlyIndex !== -1) {
          student.yearlyResults.splice(yearlyIndex, 1);
          console.log(
            `Đã xóa kết quả năm học ${schoolYear} vì không còn học kỳ nào`
          );
        }
      }
    } else {
      // Nếu còn học kỳ, cập nhật lại kết quả năm học
      await updateYearlyResults(student, schoolYear);
    }
  } catch (error) {
    console.error("Error updating yearly results after delete:", error);
  }
};

// Function để xóa năm học và tất cả học kỳ thuộc năm đó
const deleteYearlyResult = async (req, res) => {
  try {
    const { userId, schoolYear } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    console.log(
      `=== Bắt đầu xóa năm học ${schoolYear} cho sinh viên ${user.student.fullName} ===`
    );

    // Tìm kết quả năm học
    if (!user.student.yearlyResults) {
      console.log(`Không có kết quả năm học nào cho năm ${schoolYear}`);
      return res.status(404).json({
        message: `Không có kết quả năm học nào cho năm ${schoolYear}`,
      });
    }

    const yearlyIndex = user.student.yearlyResults.findIndex(
      (result) => result.schoolYear === schoolYear
    );

    if (yearlyIndex === -1) {
      console.log(`Không tìm thấy kết quả năm học cho năm ${schoolYear}`);
      return res.status(404).json({
        message: `Không tìm thấy kết quả năm học cho năm ${schoolYear}`,
      });
    }

    const yearlyResult = user.student.yearlyResults[yearlyIndex];
    console.log(
      `Tìm thấy kết quả năm học ${schoolYear} với ${
        yearlyResult.semesterIds?.length || 0
      } học kỳ`
    );

    // Xóa tất cả học kỳ thuộc năm học này bằng cách gọi API xóa học kỳ
    if (yearlyResult.semesterIds && yearlyResult.semesterIds.length > 0) {
      const semesterIdsToDelete = yearlyResult.semesterIds;
      console.log(
        `Xóa ${semesterIdsToDelete.length} học kỳ: ${semesterIdsToDelete.join(
          ", "
        )}`
      );

      // Tìm thông tin học kỳ để gọi API xóa
      const semestersToDelete = user.student.semesterResults.filter(
        (semester) => semesterIdsToDelete.includes(semester._id.toString())
      );

      // Gọi API xóa từng học kỳ
      for (const semester of semestersToDelete) {
        try {
          console.log(
            `Xóa học kỳ ${semester.semester} - ${semester.schoolYear}`
          );

          // Tìm index của học kỳ trong semesterResults
          const semesterIndex = user.student.semesterResults.findIndex(
            (result) => result._id.toString() === semester._id.toString()
          );

          if (semesterIndex !== -1) {
            // Xóa học kỳ khỏi semesterResults
            user.student.semesterResults.splice(semesterIndex, 1);
            console.log(
              `Đã xóa học kỳ ${semester.semester} - ${semester.schoolYear}`
            );
          }
        } catch (semesterError) {
          console.error(
            `Lỗi khi xóa học kỳ ${semester.semester}:`,
            semesterError
          );
        }
      }

      console.log(
        `Đã xóa ${semestersToDelete.length} học kỳ khỏi semesterResults`
      );
    }

    // Xóa kết quả năm học
    user.student.yearlyResults.splice(yearlyIndex, 1);
    console.log(`Đã xóa kết quả năm học ${schoolYear}`);

    // Cập nhật điểm tích lũy cho các học kỳ còn lại
    if (user.student.semesterResults.length > 0) {
      gradeHelper.updateCumulativeGrades(user.student.semesterResults);
      console.log(
        `Đã cập nhật điểm tích lũy cho ${user.student.semesterResults.length} học kỳ còn lại`
      );
    }

    // Lưu vào database
    await user.student.save();

    console.log(
      `=== Hoàn thành xóa năm học ${schoolYear} cho sinh viên ${user.student.fullName} ===`
    );

    return res.status(200).json({
      message: `Đã xóa thành công năm học ${schoolYear} và tất cả học kỳ thuộc năm đó`,
      deletedSemesterCount: yearlyResult.semesterIds?.length || 0,
    });
  } catch (error) {
    console.error("Error deleting yearly result:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Function helper để xóa ID học kỳ khỏi danh sách semesterIds trong năm học
const removeSemesterIdFromYearlyResult = (student, semesterId, schoolYear) => {
  try {
    if (!student.yearlyResults) return;

    const yearlyIndex = student.yearlyResults.findIndex(
      (result) => result.schoolYear === schoolYear
    );

    if (yearlyIndex !== -1) {
      const yearlyResult = student.yearlyResults[yearlyIndex];
      if (yearlyResult.semesterIds) {
        yearlyResult.semesterIds = yearlyResult.semesterIds.filter(
          (id) => id.toString() !== semesterId.toString()
        );
        yearlyResult.semesterCount = yearlyResult.semesterIds.length;
        console.log(
          `Đã xóa ID học kỳ ${semesterId} khỏi năm học ${schoolYear}`
        );
      }
    }
  } catch (error) {
    console.error("Error removing semester ID from yearly result:", error);
  }
};

// Helper function để tính toán lại CPA cho tất cả các năm học
const recalculateAllYearlyResults = async (student) => {
  console.log(
    `=== Bắt đầu tính toán lại CPA cho tất cả các năm học của sinh viên ${student.fullName} ===`
  );

  if (!student.semesterResults || student.semesterResults.length === 0) {
    console.log("Không có dữ liệu học kỳ để tính toán");
    return;
  }

  // Sắp xếp tất cả học kỳ theo thứ tự thời gian
  const allSortedSemesters = student.semesterResults.sort((a, b) => {
    const yearComparison = a.schoolYear.localeCompare(b.schoolYear);
    if (yearComparison !== 0) return yearComparison;
    const semesterA = parseInt(a.semester.replace("HK", ""));
    const semesterB = parseInt(b.semester.replace("HK", ""));
    return semesterA - semesterB;
  });

  console.log(`Tổng số học kỳ: ${allSortedSemesters.length}`);
  console.log(
    `Thứ tự học kỳ:`,
    allSortedSemesters.map((s) => `${s.semester} - ${s.schoolYear}`)
  );

  // Nhóm học kỳ theo năm học
  const semestersByYear = {};
  allSortedSemesters.forEach((semester) => {
    if (!semestersByYear[semester.schoolYear]) {
      semestersByYear[semester.schoolYear] = [];
    }
    semestersByYear[semester.schoolYear].push(semester);
  });

  // Tính toán CPA tích lũy dần dần
  let cumulativeTotalCredits = 0;
  let cumulativeTotalGradePoints4 = 0;
  let cumulativeTotalGradePoints10 = 0;

  // Xử lý từng năm học theo thứ tự thời gian
  const sortedYears = Object.keys(semestersByYear).sort();

  for (const schoolYear of sortedYears) {
    const yearSemesters = semestersByYear[schoolYear];
    console.log(`\n=== Xử lý năm học ${schoolYear} ===`);
    console.log(`Số học kỳ trong năm: ${yearSemesters.length}`);

    // Tính GPA năm học
    let yearlyTotalCredits = 0;
    let yearlyTotalGradePoints4 = 0;
    let yearlyTotalGradePoints10 = 0;
    const semesterIds = [];

    yearSemesters.forEach((semester) => {
      const credits = semester.totalCredits || 0;
      const grade4 = semester.averageGrade4 || 0;
      const grade10 = semester.averageGrade10 || 0;

      yearlyTotalCredits += credits;
      yearlyTotalGradePoints4 += grade4 * credits;
      yearlyTotalGradePoints10 += grade10 * credits;
      semesterIds.push(semester._id);

      console.log(
        `  ${semester.semester}: ${credits} TC, GPA: ${grade4.toFixed(
          2
        )} (hệ 4) / ${grade10.toFixed(2)} (hệ 10) - ID: ${semester._id}`
      );
    });

    // Cập nhật CPA tích lũy cho năm học này
    cumulativeTotalCredits += yearlyTotalCredits;
    cumulativeTotalGradePoints4 += yearlyTotalGradePoints4;
    cumulativeTotalGradePoints10 += yearlyTotalGradePoints10;

    const yearlyGPA =
      yearlyTotalCredits > 0
        ? (yearlyTotalGradePoints4 / yearlyTotalCredits).toFixed(2)
        : "0.00";
    const yearlyGrade10 =
      yearlyTotalCredits > 0
        ? (yearlyTotalGradePoints10 / yearlyTotalCredits).toFixed(2)
        : "0.00";
    const cumulativeGPA =
      cumulativeTotalCredits > 0
        ? (cumulativeTotalGradePoints4 / cumulativeTotalCredits).toFixed(2)
        : "0.00";
    const cumulativeGrade10 =
      cumulativeTotalCredits > 0
        ? (cumulativeTotalGradePoints10 / cumulativeTotalCredits).toFixed(2)
        : "0.00";

    console.log(
      `  GPA năm học: ${yearlyGPA} (hệ 4) / ${yearlyGrade10} (hệ 10)`
    );
    console.log(
      `  CPA tích lũy: ${cumulativeGPA} (hệ 4) / ${cumulativeGrade10} (hệ 10)`
    );
    console.log(`  Tổng tín chỉ tích lũy: ${cumulativeTotalCredits}`);
    console.log(`  Danh sách ID học kỳ: ${semesterIds.join(", ")}`);
    console.log(`  Số học kỳ được lưu vào semesters: ${yearSemesters.length}`);

    // Tính thống kê môn học cho năm (chỉ tính theo học kỳ trong năm đó)
    const allSubjects = yearSemesters.flatMap(
      (result) => result.subjects || []
    );
    const totalSubjects = allSubjects.length;
    const passedSubjects = allSubjects.filter(
      (subject) => subject.letterGrade && subject.letterGrade !== "F"
    ).length;
    const failedSubjects = totalSubjects - passedSubjects;

    // Xác định trạng thái học tập (chỉ dựa trên GPA năm học)
    let academicStatus = "Trung bình";
    if (yearlyGrade10 >= 8.0) academicStatus = "Tốt";
    else if (yearlyGrade10 >= 7.0) academicStatus = "Khá";
    else if (yearlyGrade10 >= 5.0) academicStatus = "Trung bình";
    else if (yearlyGrade10 >= 4.0) academicStatus = "Yếu";
    else academicStatus = "Kém";

    // Tạo hoặc cập nhật yearlyResult
    const yearlyResult = {
      schoolYear: schoolYear,
      semesters: yearSemesters, // Lưu toàn bộ dữ liệu học kỳ trong năm
      averageGrade4: parseFloat(yearlyGPA),
      averageGrade10: parseFloat(yearlyGrade10),
      cumulativeGrade4: parseFloat(cumulativeGPA),
      cumulativeGrade10: parseFloat(cumulativeGrade10),
      cumulativeCredits: cumulativeTotalCredits,
      totalCredits: yearlyTotalCredits,
      totalSubjects: totalSubjects,
      passedSubjects: passedSubjects,
      failedSubjects: failedSubjects,
      academicStatus: academicStatus,
      semesterCount: yearSemesters.length,
      semesterIds: semesterIds, // Vẫn giữ lại để tương thích
      updatedAt: new Date(),
    };

    // Cập nhật hoặc tạo mới yearlyResult
    if (!student.yearlyResults) {
      student.yearlyResults = [];
    }

    const existingYearlyIndex = student.yearlyResults.findIndex(
      (result) => result.schoolYear === schoolYear
    );

    if (existingYearlyIndex !== -1) {
      console.log(`  Cập nhật yearlyResult cho năm ${schoolYear}`);
      student.yearlyResults[existingYearlyIndex] = {
        ...student.yearlyResults[existingYearlyIndex],
        ...yearlyResult,
      };
    } else {
      console.log(`  Tạo mới yearlyResult cho năm ${schoolYear}`);
      student.yearlyResults.push({
        ...yearlyResult,
        createdAt: new Date(),
      });
    }

    // Cập nhật yearlyResultId cho các học kỳ
    const savedYearlyResult = student.yearlyResults.find(
      (result) => result.schoolYear === schoolYear
    );

    if (savedYearlyResult) {
      yearSemesters.forEach((semester) => {
        semester.yearlyResultId = savedYearlyResult._id;
      });
    }
  }

  // Xóa các yearlyResult không còn tồn tại
  const existingYears = student.yearlyResults.map(
    (result) => result.schoolYear
  );
  const validYears = Object.keys(semestersByYear);

  student.yearlyResults = student.yearlyResults.filter((result) =>
    validYears.includes(result.schoolYear)
  );

  console.log(`=== Hoàn thành tính toán lại CPA cho tất cả các năm học ===`);
  console.log(`Các năm học được cập nhật:`, validYears);
};

module.exports = {
  getStudentGrades,
  getSemesterGrades,
  addSemesterGrades,
  updateSemesterGrades,
  deleteSemesterGrades,
  deleteSemesterGradesById,
  deleteYearlyResult,
  recalculateAllYearlyResultsAPI,
  getGradeInfo,
  convertGrade,
  calculateAverage,
  getSemesterGradesByStudentId, // Added new function to exports
};
