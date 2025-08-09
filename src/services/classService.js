const Class = require("../models/class");

// Cập nhật số lượng sinh viên trong lớp
const updateClassStudentCount = async (classId) => {
  try {
    const Student = require("../models/student");

    // Đếm số sinh viên trong lớp
    const studentCount = await Student.countDocuments({ class: classId });

    // Cập nhật số lượng sinh viên trong lớp
    await Class.findByIdAndUpdate(classId, {
      studentCount: studentCount,
      updatedAt: new Date(),
    });

    console.log(`Updated class ${classId} with ${studentCount} students`);
    return studentCount;
  } catch (error) {
    console.error("Error updating class student count:", error);
    throw error;
  }
};

// Cập nhật số lượng sinh viên cho tất cả lớp
const updateAllClassesStudentCount = async () => {
  try {
    const classes = await Class.find({});

    for (const classItem of classes) {
      await updateClassStudentCount(classItem._id);
    }

    console.log("Updated student count for all classes");
  } catch (error) {
    console.error("Error updating all classes student count:", error);
    throw error;
  }
};

// Cập nhật số lượng sinh viên khi thêm sinh viên vào lớp
const addStudentToClass = async (classId) => {
  try {
    const classItem = await Class.findById(classId);
    if (!classItem) {
      throw new Error("Class not found");
    }

    // Tăng số lượng sinh viên
    await Class.findByIdAndUpdate(classId, {
      studentCount: classItem.studentCount + 1,
      updatedAt: new Date(),
    });

    console.log(
      `Added student to class ${classId}, new count: ${
        classItem.studentCount + 1
      }`
    );
  } catch (error) {
    console.error("Error adding student to class:", error);
    throw error;
  }
};

// Cập nhật số lượng sinh viên khi xóa sinh viên khỏi lớp
const removeStudentFromClass = async (classId) => {
  try {
    const classItem = await Class.findById(classId);
    if (!classItem) {
      throw new Error("Class not found");
    }

    // Giảm số lượng sinh viên (không âm)
    const newCount = Math.max(0, classItem.studentCount - 1);
    await Class.findByIdAndUpdate(classId, {
      studentCount: newCount,
      updatedAt: new Date(),
    });

    console.log(
      `Removed student from class ${classId}, new count: ${newCount}`
    );
  } catch (error) {
    console.error("Error removing student from class:", error);
    throw error;
  }
};

// Cập nhật số lượng sinh viên khi chuyển lớp
const transferStudentClass = async (oldClassId, newClassId) => {
  try {
    // Giảm số lượng sinh viên ở lớp cũ
    if (oldClassId) {
      await removeStudentFromClass(oldClassId);
    }

    // Tăng số lượng sinh viên ở lớp mới
    if (newClassId) {
      await addStudentToClass(newClassId);
    }

    console.log(
      `Transferred student from class ${oldClassId} to ${newClassId}`
    );
  } catch (error) {
    console.error("Error transferring student class:", error);
    throw error;
  }
};

module.exports = {
  updateClassStudentCount,
  updateAllClassesStudentCount,
  addStudentToClass,
  removeStudentFromClass,
  transferStudentClass,
};
