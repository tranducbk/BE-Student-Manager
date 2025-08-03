require("dotenv").config();
const moment = require("moment");
const User = require("../models/user");
const Guard = require("../models/guard");
const CommanderDutySchedule = require("../models/commander_duty_schedule");
const limit = 11;

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user)
      return res.status(404).json({ message: "Người dùng không tồn tại" });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getCommanderDutySchedules = async (req, res) => {
  const { fullName, date, page } = req.query;

  let startOfDay, endOfDay;

  const skip = (page - 1) * limit;
  try {
    let query = {};

    if (!date) {
      const currentDate = new Date();
      startOfDay = moment(currentDate).startOf("day").toDate();
      endOfDay = moment(currentDate).endOf("day").toDate();
    } else {
      // Chuyển đổi chuỗi date sang định dạng ISO 8601
      const isoDate = moment(date, "ddd MMM DD YYYY HH:mm:ss").toISOString();

      // Chuyển đổi chuỗi ISO 8601 này thành đối tượng Date và lấy startOfDay và endOfDay
      startOfDay = moment(isoDate).startOf("day").toDate();
      endOfDay = moment(isoDate).endOf("day").toDate();
    }

    if (fullName) {
      query.fullName = { $regex: new RegExp(fullName, "i") };
    }

    if (date) {
      query.workDay = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }

    const schedules = await CommanderDutySchedule.find(query)
      .sort({ workDay: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CommanderDutySchedule.countDocuments(query);

    // Tính toán tổng số trang
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({ schedules, totalPages });
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const getCommanderDutySchedule = async (req, res) => {
  try {
    let { year, month, page } = req.query;
    const skip = (page - 1) * limit;

    // Nếu không có tháng và năm được truyền vào, sử dụng thời gian hiện tại
    if (!year || !month) {
      const currentDate = new Date();
      year = String(currentDate.getFullYear());
      month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Lấy tháng hiện tại, bắt đầu từ 0
    }

    // Tính toán ngày bắt đầu và kết thúc của tháng được chỉ định
    const startOfMonth = moment(`${year}-${month}-01`, "YYYY-MM-DD").startOf(
      "month"
    );
    const endOfMonth = moment(startOfMonth).endOf("month");

    const schedules = await CommanderDutySchedule.find({
      workDay: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
    })
      .sort({ workDay: -1 })
      .skip(skip)
      .limit(limit);

    const totalCount = await CommanderDutySchedule.countDocuments({
      workDay: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
    });

    // Tính toán tổng số trang
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({ schedules, totalPages });
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const getCommanderDutySchedulesCurrent = async (req, res) => {
  try {
    const schedules = await CommanderDutySchedule.find();

    return res.status(200).json(schedules);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCommanderDutyScheduleByUserId = async (req, res) => {
  try {
    const schedule = await CommanderDutySchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: "Không tìm thấy lịch trực" });
    }

    return res.status(200).json(schedule);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
const updateCommanderDutySchedule = async (req, res) => {
  try {
    const updatedSchedule = await CommanderDutySchedule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    return res.status(200).json(updatedSchedule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCommanderDutySchedule = async (req, res) => {
  try {
    const schedule = new CommanderDutySchedule({
      fullName: req.body.fullName,
      workDay: req.body.workDay,
      rank: req.body.rank,
      phoneNumber: req.body.phoneNumber,
      position: req.body.position,
    });

    const newSchedule = await schedule.save();
    return res.status(201).json(newSchedule);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCommanderDutySchedule = async (req, res) => {
  try {
    await CommanderDutySchedule.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: "Xóa thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getGuards = async (req, res) => {
  try {
    let { year, month } = req.query;

    // Nếu không có tháng và năm được truyền vào, sử dụng thời gian hiện tại
    if (!year || !month) {
      const currentDate = new Date();
      year = String(currentDate.getFullYear());
      month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Lấy tháng hiện tại, bắt đầu từ 0
    }

    // Tính toán ngày bắt đầu và kết thúc của tháng được chỉ định
    const startOfMonth = moment(`${year}-${month}-01`, "YYYY-MM-DD").startOf(
      "month"
    );
    const endOfMonth = moment(startOfMonth).endOf("month");

    // Tìm kiếm guard trong khoảng thời gian được chỉ định
    const guards = await Guard.find({
      dayGuard: {
        $gte: startOfMonth.toDate(),
        $lte: endOfMonth.toDate(),
      },
    });

    return res.status(200).json(guards);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const createguard = async (req, res) => {
  try {
    const newGuard = new Guard(req.body);
    const savedGuard = await newGuard.save();
    return res.status(201).json(savedGuard);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateGuard = async (req, res) => {
  try {
    const guard = await Guard.findByIdAndUpdate(req.params.guardId, req.body, {
      new: true,
    });
    if (!guard) {
      return res.status(404).json({ message: "Guard không tồn tại" });
    }
    return res.status(200).json(guard);
  } catch (err) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteGuard = async (req, res) => {
  try {
    await Guard.deleteOne({
      dayGuard: req.params.date,
    });

    return res.status(200).json(`Đã xóa Guard thành công`);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getListGuard = async (req, res) => {
  const date = req.query.date;
  try {
    let guards = [];

    if (date && date !== "null" && date !== "undefined") {
      let data = await Guard.findOne({ dayGuard: date });
      if (data) {
        guards = [data];
      } else {
        guards = [];
      }
    } else {
      guards = await Guard.find({}).sort({ dayGuard: -1 });
    }

    return res.status(200).json(guards);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Lỗi server" });
  }
};

const getGuardDetail = async (req, res) => {
  try {
    const guards = (await Guard.find({ dayGuard: req.params.dayGuard })) || [];

    if (guards.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy Guard" });
    }

    return res.status(200).json(guards);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

module.exports = {
  getUser,
  getCommanderDutySchedules,
  getCommanderDutyScheduleByUserId,
  updateCommanderDutySchedule,
  createCommanderDutySchedule,
  deleteCommanderDutySchedule,
  getCommanderDutySchedule,
  getCommanderDutySchedulesCurrent,
  getGuards,
  createguard,
  updateGuard,
  deleteGuard,
  getListGuard,
  getGuardDetail,
};
