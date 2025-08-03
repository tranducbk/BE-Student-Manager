/**
 * Helper functions để tính điểm và chuyển đổi giữa các hệ điểm
 */

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

// Chuyển đổi điểm hệ 10 sang điểm chữ
const grade10ToLetter = (grade10) => {
  if (grade10 >= 9.0) return "A+";
  if (grade10 >= 8.5) return "A";
  if (grade10 >= 8.0) return "B+";
  if (grade10 >= 7.5) return "B";
  if (grade10 >= 7.0) return "C+";
  if (grade10 >= 6.5) return "C";
  if (grade10 >= 6.0) return "D+";
  if (grade10 >= 5.0) return "D";
  return "F";
};

// Chuyển đổi điểm hệ 4 sang điểm hệ 10
const grade4ToGrade10 = (grade4) => {
  if (grade4 >= 4.0) return 10.0;
  if (grade4 >= 3.5) return 8.5;
  if (grade4 >= 3.0) return 8.0;
  if (grade4 >= 2.5) return 7.5;
  if (grade4 >= 2.0) return 7.0;
  if (grade4 >= 1.5) return 6.5;
  if (grade4 >= 1.0) return 6.0;
  return 0.0;
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

  return totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
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

  return totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
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

  return totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
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

  return totalCredits > 0 ? totalGradePoints / totalCredits : 0.0;
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
  semesterResult.averageGrade10 = calculateAverageGrade10(subjects);
  semesterResult.updatedAt = new Date();

  return semesterResult;
};

// Cập nhật điểm tích lũy cho tất cả học kỳ
const updateCumulativeGrades = (allSemesterResults) => {
  const cumulativeCredits = calculateCumulativeCredits(allSemesterResults);
  const cumulativeGrade4 = calculateCumulativeGrade4(allSemesterResults);
  const cumulativeGrade10 = calculateCumulativeGrade10(allSemesterResults);

  allSemesterResults.forEach((semester) => {
    semester.cumulativeCredits = cumulativeCredits;
    semester.cumulativeGrade4 = cumulativeGrade4;
    semester.cumulativeGrade10 = cumulativeGrade10;
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

module.exports = {
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
};
