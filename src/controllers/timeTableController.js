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

    const timeTable = await TimeTable.create(req.body);
    student.timeTable.push(timeTable._id);
    await student.save();

    // Tự động cập nhật lịch cắt cơm
    try {
      const autoCutRiceService = require("../services/autoCutRiceService");
      await autoCutRiceService.updateAutoCutRice(student._id);
    } catch (autoCutError) {
      console.error("Error updating auto cut rice:", autoCutError);
      // Không fail request nếu auto cut rice lỗi
    }

    return res.status(201).json({
      timeTable: timeTable,
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

    return res
      .status(200)
      .json({ message: "TimeTable đã được xóa thành công" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateTimeTable = async (req, res) => {
  try {
    const updatedTimeTable = await TimeTable.findByIdAndUpdate(
      req.params.timeTableId,
      req.body
    );

    if (!updatedTimeTable) {
      return res.status(404).json({ message: "timeTable không tồn tại" });
    }

    return res.status(200).json(updatedTimeTable);
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
