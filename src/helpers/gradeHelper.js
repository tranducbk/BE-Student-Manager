/**
 * Helper functions để tính điểm và chuyển đổi giữa các hệ điểm
 */

// Helper function để format semester thành "HK1", "HK2", "HK3"
const formatSemester = (semester) => {
  if (typeof semester === "number") {
    return `HK${semester}`;
  } else if (typeof semester === "string" && !semester.startsWith("HK")) {
    return `HK${semester}`;
  }
  return semester;
};

// Bảng chuyển đổi điểm chữ sang điểm hệ 4
const LETTER_TO_GRADE_4 = {
  "A+": 4.0,
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  "D+": 1.5,
  D: 1.0,
  F: 0.0,
};

// Bảng chuyển đổi điểm chữ sang điểm hệ 10
const LETTER_TO_GRADE_10 = {
  "A+": 10.0,
  A: 9.0,
  "B+": 8.5,
  B: 8.0,
  "C+": 7.5,
  C: 7.0,
  "D+": 6.5,
  D: 6.0,
  F: 0.0,
};

// Bảng chuyển đổi điểm hệ 4 sang điểm chữ
const GRADE_4_TO_LETTER = {
  4.0: "A+",
  3.5: "B+",
  3.0: "B",
  2.5: "C+",
  2.0: "C",
  1.5: "D+",
  1.0: "D",
  0.0: "F",
};

// Bảng chuyển đổi điểm hệ 10 sang điểm chữ
const GRADE_10_TO_LETTER = {
  10.0: "A+",
  9.0: "A",
  8.5: "B+",
  8.0: "B",
  7.5: "C+",
  7.0: "C",
  6.5: "D+",
  6.0: "D",
  0.0: "F",
};

// Chuyển đổi điểm chữ sang điểm hệ 4
const letterToGrade4 = (letterGrade) => {
  return LETTER_TO_GRADE_4[letterGrade] || 0.0;
};

// Chuyển đổi điểm chữ sang điểm hệ 10
const letterToGrade10 = (letterGrade) => {
  return LETTER_TO_GRADE_10[letterGrade] || 0.0;
};

// Chuyển đổi điểm hệ 4 sang điểm chữ
const grade4ToLetter = (grade4) => {
  if (grade4 >= 4.0) return "A+";
  if (grade4 >= 3.5) return "B+";
  if (grade4 >= 3.0) return "B";
  if (grade4 >= 2.5) return "C+";
  if (grade4 >= 2.0) return "C";
  if (grade4 >= 1.5) return "D+";
  if (grade4 >= 1.0) return "D";
  return "F";
};

// Chuyển đổi điểm hệ 10 sang điểm chữ (theo bảng ngưỡng: 0-3.9 F, 4.0-4.9 D, 5.0-5.4 D+,
// 5.5-6.4 C, 6.5-6.9 C+, 7.0-7.9 B, 8.0-8.4 B+, 8.5-9.4 A, 9.5-10 A+)
const grade10ToLetter = (grade10) => {
  const g = parseFloat(grade10);
  if (isNaN(g)) return "F";
  if (g >= 9.5) return "A+";
  if (g >= 8.5) return "A";
  if (g >= 8.0) return "B+";
  if (g >= 7.0) return "B";
  if (g >= 6.5) return "C+";
  if (g >= 5.5) return "C";
  if (g >= 5.0) return "D+";
  if (g >= 4.0) return "D";
  return "F";
};

// Chuyển đổi điểm hệ 4 sang điểm hệ 10 (tuyến tính theo dải – theo bảng quy đổi)
const grade4ToGrade10 = (grade4) => {
  const g = parseFloat(grade4);
  if (isNaN(g)) return 0.0;
  if (g < 2.0) return 0.0; // rớt
  // 2.0 đến cận 2.5: a=3.00; b=-0.5 => 10 = 4*a + b
  if (g < 2.5) return Math.min(10.0, 3.0 * g - 0.5);
  // 2.5 đến cận 3.2: a=1.42; b=3.45
  if (g < 3.2) return Math.min(10.0, 1.42 * g + 3.45);
  // 3.2 đến cận 3.6: a=2.50; b=0.00
  if (g < 3.6) return Math.min(10.0, 2.5 * g + 0.0);
  // 3.6 đến tròn 4.0: a=2.50; b=0.00
  return Math.min(10.0, 2.5 * g + 0.0);
};

// Chuyển đổi điểm hệ 10 sang điểm hệ 4
const grade10ToGrade4 = (grade10) => {
  if (grade10 >= 9.0) return 4.0;
  if (grade10 >= 8.5) return 3.5;
  if (grade10 >= 8.0) return 3.0;
  if (grade10 >= 7.5) return 2.5;
  if (grade10 >= 7.0) return 2.0;
  if (grade10 >= 6.5) return 1.5;
  if (grade10 >= 6.0) return 1.0;
  return 0.0;
};

// Tính điểm trung bình hệ 4 cho một danh sách môn học
const calculateAverageGrade4 = (subjects) => {
  if (!subjects || subjects.length === 0) return 0.0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  subjects.forEach((subject) => {
    totalGradePoints += subject.gradePoint4 * subject.credits;
    totalCredits += subject.credits;
  });

  return totalCredits > 0
    ? Math.round((totalGradePoints / totalCredits) * 100) / 100
    : 0.0;
};

// Tính điểm trung bình hệ 10 cho một danh sách môn học
const calculateAverageGrade10 = (subjects) => {
  if (!subjects || subjects.length === 0) return 0.0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  subjects.forEach((subject) => {
    totalGradePoints += subject.gradePoint10 * subject.credits;
    totalCredits += subject.credits;
  });

  return totalCredits > 0
    ? Math.round((totalGradePoints / totalCredits) * 100) / 100
    : 0.0;
};

// Tổng tín chỉ nợ trong danh sách môn
const calculateDebtCredits = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;

  return subjects.reduce((sum, s) => {
    const credits = s.credits || 0;
    const isDebt = s.letterGrade === "F" || s.gradePoint4 === 0;
    return sum + (isDebt ? credits : 0);
  }, 0);
};

// Số môn nợ (điểm F hoặc hệ 4 = 0)
const calculateFailedSubjects = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;
  return subjects.filter((s) => s.letterGrade === "F" || s.gradePoint4 === 0)
    .length;
};

// Tính điểm trung bình hệ 10 cho học kỳ dựa trên GPA hệ 4 và công thức tuyến tính
const calculateSemesterAverage10FromGpa4 = (averageGrade4) => {
  return grade4ToGrade10(averageGrade4);
};

// Tính tổng số tín chỉ
const calculateTotalCredits = (subjects) => {
  if (!subjects || subjects.length === 0) return 0;

  return subjects.reduce((total, subject) => total + subject.credits, 0);
};

// Tính điểm tích lũy hệ 4
const calculateCumulativeGrade4 = (allSemesterResults) => {
  if (!allSemesterResults || allSemesterResults.length === 0) return 0.0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  allSemesterResults.forEach((semester) => {
    semester.subjects.forEach((subject) => {
      totalGradePoints += subject.gradePoint4 * subject.credits;
      totalCredits += subject.credits;
    });
  });

  return totalCredits > 0
    ? Math.round((totalGradePoints / totalCredits) * 100) / 100
    : 0.0;
};

// Tính điểm tích lũy hệ 10
const calculateCumulativeGrade10 = (allSemesterResults) => {
  if (!allSemesterResults || allSemesterResults.length === 0) return 0.0;

  let totalGradePoints = 0;
  let totalCredits = 0;

  allSemesterResults.forEach((semester) => {
    semester.subjects.forEach((subject) => {
      totalGradePoints += subject.gradePoint10 * subject.credits;
      totalCredits += subject.credits;
    });
  });

  return totalCredits > 0
    ? Math.round((totalGradePoints / totalCredits) * 100) / 100
    : 0.0;
};

// Tính tổng tín chỉ tích lũy
const calculateCumulativeCredits = (allSemesterResults) => {
  if (!allSemesterResults || allSemesterResults.length === 0) return 0;

  let totalCredits = 0;

  allSemesterResults.forEach((semester) => {
    semester.subjects.forEach((subject) => {
      totalCredits += subject.credits;
    });
  });

  return totalCredits;
};

// Tạo object kết quả môn học từ điểm chữ
const createSubjectResult = (
  subjectCode,
  subjectName,
  credits,
  letterGrade
) => {
  const gradePoint4 = letterToGrade4(letterGrade);
  const gradePoint10 = letterToGrade10(letterGrade);

  return {
    subjectCode,
    subjectName,
    credits,
    letterGrade,
    gradePoint4,
    gradePoint10,
  };
};

// Cập nhật kết quả học kỳ
const updateSemesterResult = (semesterResult) => {
  const { subjects } = semesterResult;

  semesterResult.totalCredits = calculateTotalCredits(subjects);
  semesterResult.averageGrade4 = calculateAverageGrade4(subjects);
  semesterResult.averageGrade10 = calculateSemesterAverage10FromGpa4(
    semesterResult.averageGrade4
  );
  // Cập nhật nợ
  semesterResult.debtCredits = calculateDebtCredits(subjects);
  semesterResult.failedSubjects = calculateFailedSubjects(subjects);
  semesterResult.updatedAt = new Date();

  return semesterResult;
};

// Cập nhật điểm tích lũy cho tất cả học kỳ (lũy tiến theo thời gian)
const updateCumulativeGrades = (allSemesterResults) => {
  if (!Array.isArray(allSemesterResults) || allSemesterResults.length === 0) {
    return allSemesterResults || [];
  }

  const sorted = [...allSemesterResults].sort((a, b) => {
    const yearComparison = String(a.schoolYear).localeCompare(
      String(b.schoolYear)
    );
    if (yearComparison !== 0) return yearComparison;
    const sa = parseInt(String(a.semester).replace("HK", ""));
    const sb = parseInt(String(b.semester).replace("HK", ""));
    return (isNaN(sa) ? 0 : sa) - (isNaN(sb) ? 0 : sb);
  });

  let accCredits = 0;
  let accGradePoints4 = 0;
  let accGradePoints10 = 0;

  sorted.forEach((semester) => {
    const subjects = semester.subjects || [];
    const semesterCredits = calculateTotalCredits(subjects);
    const avg4 = calculateAverageGrade4(subjects);
    const avg10 = calculateAverageGrade10(subjects);

    // Đồng bộ lại các trường học kỳ (làm tròn đến 2 chữ số thập phân)
    semester.totalCredits = semesterCredits;
    semester.averageGrade4 = Math.round(avg4 * 100) / 100;
    semester.averageGrade10 = Math.round(avg10 * 100) / 100;
    semester.debtCredits = calculateDebtCredits(subjects);
    semester.failedSubjects = calculateFailedSubjects(subjects);

    // Tích lũy
    accCredits += semesterCredits;
    accGradePoints4 += avg4 * semesterCredits;
    accGradePoints10 += avg10 * semesterCredits;

    semester.cumulativeCredits = accCredits;
    semester.cumulativeGrade4 =
      accCredits > 0
        ? Math.round((accGradePoints4 / accCredits) * 100) / 100
        : 0.0;
    semester.cumulativeGrade10 =
      accCredits > 0
        ? Math.round((accGradePoints10 / accCredits) * 100) / 100
        : 0.0;
    semester.studentLevel = calculateStudentLevel(accCredits);
    semester.updatedAt = new Date();
  });

  return allSemesterResults;
};

// Kiểm tra điểm có hợp lệ không
const isValidLetterGrade = (letterGrade) => {
  return Object.keys(LETTER_TO_GRADE_4).includes(letterGrade);
};

// Lấy thông tin chi tiết về điểm
const getGradeInfo = (letterGrade) => {
  if (!isValidLetterGrade(letterGrade)) {
    return null;
  }

  return {
    letterGrade,
    gradePoint4: letterToGrade4(letterGrade),
    gradePoint10: letterToGrade10(letterGrade),
    description: getGradeDescription(letterGrade),
  };
};

// Mô tả điểm
const getGradeDescription = (letterGrade) => {
  const descriptions = {
    "A+": "Xuất sắc",
    A: "Giỏi",
    "B+": "Khá giỏi",
    B: "Khá",
    "C+": "Trung bình khá",
    C: "Trung bình",
    "D+": "Trung bình yếu",
    D: "Yếu",
    F: "Kém",
  };

  return descriptions[letterGrade] || "Không xác định";
};

// Tính điểm trung bình từ điểm hệ 10
const calculateAverageFromGrade10 = (grades) => {
  if (!grades || grades.length === 0) return 0.0;

  const sum = grades.reduce((total, grade) => total + grade, 0);
  return sum / grades.length;
};

// Tính điểm trung bình từ điểm hệ 4
const calculateAverageFromGrade4 = (grades) => {
  if (!grades || grades.length === 0) return 0.0;

  const sum = grades.reduce((total, grade) => total + grade, 0);
  return sum / grades.length;
};

// Tính năm học dựa trên số tín chỉ tích lũy
const calculateStudentLevel = (cumulativeCredits) => {
  const credits = parseInt(cumulativeCredits) || 0;

  if (credits < 32) return 1; // Năm thứ nhất
  if (credits < 64) return 2; // Năm thứ hai
  if (credits < 96) return 3; // Năm thứ ba
  if (credits < 128) return 4; // Năm thứ tư
  return 5; // Năm thứ năm
};

module.exports = {
  formatSemester,
  LETTER_TO_GRADE_4,
  LETTER_TO_GRADE_10,
  GRADE_4_TO_LETTER,
  GRADE_10_TO_LETTER,
  letterToGrade4,
  letterToGrade10,
  grade4ToLetter,
  grade10ToLetter,
  grade4ToGrade10,
  grade10ToGrade4,
  calculateAverageGrade4,
  calculateAverageGrade10,
  calculateDebtCredits,
  calculateFailedSubjects,
  calculateSemesterAverage10FromGpa4,
  calculateTotalCredits,
  calculateCumulativeGrade4,
  calculateCumulativeGrade10,
  calculateCumulativeCredits,
  createSubjectResult,
  updateSemesterResult,
  updateCumulativeGrades,
  isValidLetterGrade,
  getGradeInfo,
  getGradeDescription,
  calculateAverageFromGrade10,
  calculateAverageFromGrade4,
  calculateStudentLevel,
};
