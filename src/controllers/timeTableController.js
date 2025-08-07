const TimeTable = require("../models/time_table");
const User = require("../models/user");

const getTimeTable = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "student",
      populate: {
        path: "timeTable",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const timeTables = student.timeTable;
    return res.json(timeTables);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const createTimeTable = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    if (!student.timeTable) {
      student.timeTable = [];
    }

    // Tự động tạo trường time từ startTime và endTime
    const timeData = { ...req.body };
    if (timeData.startTime && timeData.endTime) {
      timeData.time = `${timeData.startTime} - ${timeData.endTime}`;
    }

    const timeTable = await TimeTable.create(timeData);
    student.timeTable.push(timeTable._id);
    await student.save();

    // Tự động cập nhật lịch cắt cơm
    try {
      console.log(`[DEBUG] Creating time table for student: ${student._id}`);
      const autoCutRiceService = require("../services/autoCutRiceService");
      await autoCutRiceService.updateAutoCutRice(student._id);
      console.log(
        `[DEBUG] Successfully updated auto cut rice for student: ${student._id}`
      );
    } catch (autoCutError) {
      console.error("Error updating auto cut rice:", autoCutError);
    }

    return res.status(201).json({
      ...timeTable.toObject(),
      message: "Tạo lịch học thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteTimeTable = async (req, res) => {
  try {
    const { userId, timeTableId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const timeTable = await TimeTable.findById(timeTableId);
    if (!timeTable) {
      return res.status(404).json({ message: "TimeTable không tồn tại" });
    }

    // Kiểm tra xem timeTableId có tồn tại trong student.timeTable hay không
    const index = student.timeTable.indexOf(timeTableId);
    if (index === -1) {
      return res
        .status(400)
        .json({ message: "TimeTable không thuộc sinh viên này" });
    }

    // Xóa timeTableId từ mảng student.timeTable
    student.timeTable.splice(index, 1);
    await student.save();

    // Xóa timeTable từ cơ sở dữ liệu
    await TimeTable.deleteOne({ _id: timeTableId });

    // Tự động cập nhật lịch cắt cơm sau khi xóa
    try {
      console.log(
        `[DEBUG] Deleting time table: ${timeTableId} for student: ${student._id}`
      );
      const autoCutRiceService = require("../services/autoCutRiceService");
      await autoCutRiceService.updateAutoCutRice(student._id);
      console.log(
        `[DEBUG] Successfully updated auto cut rice for student: ${student._id}`
      );
    } catch (autoCutError) {
      console.error("Error updating auto cut rice:", autoCutError);
    }

    return res.status(200).json({
      message:
        "TimeTable đã được xóa thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateTimeTable = async (req, res) => {
  try {
    // Tự động cập nhật trường time từ startTime và endTime
    const updateData = { ...req.body };
    if (updateData.startTime && updateData.endTime) {
      updateData.time = `${updateData.startTime} - ${updateData.endTime}`;
    }

    const updatedTimeTable = await TimeTable.findByIdAndUpdate(
      req.params.timeTableId,
      updateData,
      { new: true }
    );

    if (!updatedTimeTable) {
      return res.status(404).json({ message: "timeTable không tồn tại" });
    }

    // Tìm student để cập nhật lịch cắt cơm
    try {
      console.log(`[DEBUG] Updating time table: ${req.params.timeTableId}`);
      const Student = require("../models/student");
      // Tìm student bằng cách tìm trong mảng timeTable
      const student = await Student.findOne({
        timeTable: { $in: [req.params.timeTableId] },
      });
      if (student) {
        console.log(
          `[DEBUG] Found student: ${student._id}, updating auto cut rice`
        );
        const autoCutRiceService = require("../services/autoCutRiceService");
        await autoCutRiceService.updateAutoCutRice(student._id);
        console.log(
          `[DEBUG] Successfully updated auto cut rice for student: ${student._id}`
        );
      } else {
        console.log(
          `[DEBUG] No student found for time table: ${req.params.timeTableId}`
        );
      }
    } catch (autoCutError) {
      console.error("Error updating auto cut rice:", autoCutError);
    }

    return res.status(200).json({
      timeTable: updatedTimeTable,
      message:
        "Cập nhật lịch học thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getTimeTable,
  createTimeTable,
  deleteTimeTable,
  updateTimeTable,
};
