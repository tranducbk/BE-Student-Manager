const timeHelper = require("../helpers/timeHelper");

// Format thời gian từ HH:mm sang phút
const formatTimeToMinutes = (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({ message: "Thời gian không được để trống" });
    }

    const minutes = timeHelper.formatTimeToMinutes(time);

    return res.status(200).json({
      original: time,
      minutes: minutes,
      formatted: `${minutes} phút`,
    });
  } catch (error) {
    console.error("Error formatting time to minutes:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Format thời gian từ phút sang HH:mm
const formatMinutesToTime = (req, res) => {
  try {
    const { minutes } = req.body;

    if (!minutes || isNaN(minutes)) {
      return res.status(400).json({ message: "Số phút không hợp lệ" });
    }

    const time = timeHelper.formatMinutesToTime(parseInt(minutes));

    return res.status(200).json({
      original: minutes,
      time: time,
      formatted: `${time}`,
    });
  } catch (error) {
    console.error("Error formatting minutes to time:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// So sánh 2 thời gian
const compareTimes = (req, res) => {
  try {
    const { time1, time2 } = req.body;

    if (!time1 || !time2) {
      return res.status(400).json({ message: "Cần 2 thời gian để so sánh" });
    }

    if (!timeHelper.isValidTime(time1) || !timeHelper.isValidTime(time2)) {
      return res
        .status(400)
        .json({ message: "Định dạng thời gian không hợp lệ (HH:mm)" });
    }

    const result = timeHelper.compareTime(time1, time2);
    const difference = timeHelper.getTimeDifference(time1, time2);

    let comparison = "";
    if (result === -1) comparison = `${time1} < ${time2}`;
    else if (result === 1) comparison = `${time1} > ${time2}`;
    else comparison = `${time1} = ${time2}`;

    return res.status(200).json({
      time1,
      time2,
      comparison,
      difference: `${difference} phút`,
      result,
    });
  } catch (error) {
    console.error("Error comparing times:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Validate và format thời gian
const validateTime = (req, res) => {
  try {
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({ message: "Thời gian không được để trống" });
    }

    const formattedTime = timeHelper.validateAndFormatTime(time);
    const isValid = timeHelper.isValidTime(formattedTime);
    const timeInfo = timeHelper.getTimeInfo(formattedTime);

    return res.status(200).json({
      original: time,
      formatted: formattedTime,
      isValid,
      timeInfo,
    });
  } catch (error) {
    console.error("Error validating time:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Tính toán thời gian đi lại
const calculateTravelTime = (req, res) => {
  try {
    const { startTime, travelMinutes } = req.body;

    if (!startTime || !travelMinutes) {
      return res.status(400).json({
        message: "Thời gian bắt đầu và thời gian đi lại không được để trống",
      });
    }

    if (!timeHelper.isValidTime(startTime)) {
      return res
        .status(400)
        .json({ message: "Định dạng thời gian bắt đầu không hợp lệ (HH:mm)" });
    }

    if (isNaN(travelMinutes) || travelMinutes < 0) {
      return res
        .status(400)
        .json({ message: "Thời gian đi lại phải là số dương" });
    }

    const departureTime = timeHelper.calculateTravelTime(
      startTime,
      parseInt(travelMinutes)
    );
    const returnTime = timeHelper.calculateReturnTime(
      startTime,
      parseInt(travelMinutes)
    );

    return res.status(200).json({
      startTime,
      travelMinutes: parseInt(travelMinutes),
      departureTime,
      returnTime,
      formatted: {
        departure: `${departureTime}`,
        return: `${returnTime}`,
      },
    });
  } catch (error) {
    console.error("Error calculating travel time:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Kiểm tra thời gian có nằm trong khoảng không
const checkTimeInRange = (req, res) => {
  try {
    const { time, startTime, endTime } = req.body;

    if (!time || !startTime || !endTime) {
      return res.status(400).json({
        message: "Thời gian, thời gian bắt đầu và kết thúc không được để trống",
      });
    }

    // Validate tất cả thời gian
    const times = [time, startTime, endTime];
    for (let t of times) {
      if (!timeHelper.isValidTime(t)) {
        return res
          .status(400)
          .json({ message: `Định dạng thời gian không hợp lệ: ${t} (HH:mm)` });
      }
    }

    const isInRange = timeHelper.isTimeInRange(time, startTime, endTime);

    return res.status(200).json({
      time,
      startTime,
      endTime,
      isInRange,
      message: isInRange
        ? "Thời gian nằm trong khoảng"
        : "Thời gian không nằm trong khoảng",
    });
  } catch (error) {
    console.error("Error checking time in range:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thông tin thời gian chi tiết
const getTimeInfo = (req, res) => {
  try {
    const { time } = req.params;

    if (!time) {
      return res.status(400).json({ message: "Thời gian không được để trống" });
    }

    const timeInfo = timeHelper.getTimeInfo(time);

    if (!timeInfo) {
      return res
        .status(400)
        .json({ message: "Định dạng thời gian không hợp lệ (HH:mm)" });
    }

    return res.status(200).json(timeInfo);
  } catch (error) {
    console.error("Error getting time info:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thời gian hiện tại
const getCurrentTime = (req, res) => {
  try {
    const currentTime = timeHelper.getCurrentTime();
    const timeInfo = timeHelper.getTimeInfo(currentTime);

    return res.status(200).json({
      currentTime,
      timeInfo,
    });
  } catch (error) {
    console.error("Error getting current time:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  formatTimeToMinutes,
  formatMinutesToTime,
  compareTimes,
  validateTime,
  calculateTravelTime,
  checkTimeInRange,
  getTimeInfo,
  getCurrentTime,
};
