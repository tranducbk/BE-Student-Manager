const TimeTable = require("../models/time_table");
const User = require("../models/user");

const getTimeTable = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Lấy lịch học từ model time_table
    const timeTable = await TimeTable.findOne({ studentId: student._id });
    return res.json(timeTable ? timeTable.schedules : []);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const createTimeTable = async (req, res) => {
  try {
    const { userId } = req.params;
    const scheduleData = req.body;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tự động tạo time string từ startTime và endTime
    if (scheduleData.startTime && scheduleData.endTime) {
      scheduleData.time = `${scheduleData.startTime} - ${scheduleData.endTime}`;
    }

    // Tìm hoặc tạo timeTable cho sinh viên
    let timeTable = await TimeTable.findOne({ studentId: student._id });

    if (!timeTable) {
      // Tạo mới timeTable cho sinh viên
      timeTable = await TimeTable.create({
        studentId: student._id,
        schedules: [scheduleData],
      });
    } else {
      // Thêm schedule vào timeTable hiện có
      timeTable.schedules.push(scheduleData);
      await timeTable.save();
    }

    // Tự động cập nhật lịch cắt cơm sau khi thêm
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
      message: "Thêm lịch học thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteTimeTable = async (req, res) => {
  try {
    const { userId, scheduleId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const timeTable = await TimeTable.findOne({ studentId: student._id });
    if (!timeTable) {
      return res.status(404).json({ message: "TimeTable không tồn tại" });
    }

    // Tìm schedule cụ thể trong mảng schedules bằng _id
    const scheduleIndex = timeTable.schedules.findIndex(
      (schedule) => schedule._id.toString() === scheduleId
    );
    if (scheduleIndex === -1) {
      return res.status(404).json({ message: "Schedule không tồn tại" });
    }

    // Xóa schedule tại vị trí tìm được
    timeTable.schedules.splice(scheduleIndex, 1);
    await timeTable.save();

    // Tự động cập nhật lịch cắt cơm sau khi xóa
    try {
      console.log(
        `[DEBUG] Deleting schedule: ${scheduleId} for student: ${student._id}`
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
        "Schedule đã được xóa thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateTimeTable = async (req, res) => {
  try {
    const { userId, scheduleId } = req.params;

    console.log(
      `[DEBUG] Updating schedule: scheduleId=${scheduleId}, userId=${userId}`
    );

    // Tự động cập nhật trường time từ startTime và endTime
    const updateData = { ...req.body };
    if (updateData.startTime && updateData.endTime) {
      updateData.time = `${updateData.startTime} - ${updateData.endTime}`;
    }

    console.log(`[DEBUG] Update data:`, updateData);

    // Tìm user và student
    const user = await User.findById(userId).populate("student");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    // Tìm timeTable của student
    const timeTable = await TimeTable.findOne({ studentId: student._id });

    if (!timeTable) {
      console.log(`[DEBUG] TimeTable not found for studentId: ${student._id}`);
      return res.status(404).json({ message: "TimeTable không tồn tại" });
    }

    console.log(
      `[DEBUG] Found timeTable with ${timeTable.schedules.length} schedules`
    );

    // Tìm schedule cụ thể trong mảng schedules bằng _id
    const scheduleIndex = timeTable.schedules.findIndex(
      (schedule) => schedule._id.toString() === scheduleId
    );

    if (scheduleIndex === -1) {
      console.log(`[DEBUG] Schedule not found: ${scheduleId}`);
      console.log(
        `[DEBUG] Available schedule IDs:`,
        timeTable.schedules.map((s) => s._id.toString())
      );
      return res.status(404).json({ message: "Schedule không tồn tại" });
    }

    console.log(`[DEBUG] Found schedule at index: ${scheduleIndex}`);

    // Cập nhật schedule tại vị trí tìm được
    timeTable.schedules[scheduleIndex] = {
      ...timeTable.schedules[scheduleIndex],
      ...updateData,
    };
    await timeTable.save();

    console.log(`[DEBUG] Successfully updated schedule`);

    // Tự động cập nhật lịch cắt cơm
    try {
      const autoCutRiceService = require("../services/autoCutRiceService");
      await autoCutRiceService.updateAutoCutRice(student._id);
      console.log(
        `[DEBUG] Successfully updated auto cut rice for student: ${student._id}`
      );
    } catch (autoCutError) {
      console.error("Error updating auto cut rice:", autoCutError);
    }

    return res.status(200).json({
      timeTable: timeTable.schedules[scheduleIndex],
      message:
        "Cập nhật lịch học thành công và đã cập nhật lịch cắt cơm tự động",
    });
  } catch (error) {
    console.error("Error in updateTimeTable:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getTimeTable,
  createTimeTable,
  deleteTimeTable,
  updateTimeTable,
};
