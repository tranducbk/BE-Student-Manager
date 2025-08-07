/**
 * Helper functions để xử lý thời gian
 */

// Chuyển đổi thời gian từ HH:mm sang phút
const timeToMinutes = (timeString) => {
  if (!timeString) return 0;

  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
};

// Chuyển đổi phút sang HH:mm
const minutesToTime = (totalMinutes) => {
  if (totalMinutes < 0) totalMinutes = 0;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
};

// Format thời gian từ phút sang HH:mm
const formatMinutesToTime = (minutes) => {
  return minutesToTime(minutes);
};

// Format thời gian từ HH:mm sang phút
const formatTimeToMinutes = (timeString) => {
  return timeToMinutes(timeString);
};

// So sánh 2 thời gian (HH:mm)
const compareTime = (time1, time2) => {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);

  if (minutes1 < minutes2) return -1; // time1 < time2
  if (minutes1 > minutes2) return 1; // time1 > time2
  return 0; // time1 == time2
};

// Kiểm tra thời gian có hợp lệ không (HH:mm format)
const isValidTime = (timeString) => {
  if (!timeString || typeof timeString !== "string") return false;

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

// Tính khoảng cách giữa 2 thời gian (phút)
const getTimeDifference = (time1, time2) => {
  const minutes1 = timeToMinutes(time1);
  const minutes2 = timeToMinutes(time2);
  return Math.abs(minutes1 - minutes2);
};

// Cộng thời gian với số phút
const addMinutesToTime = (timeString, minutes) => {
  const totalMinutes = timeToMinutes(timeString) + minutes;
  return minutesToTime(totalMinutes);
};

// Trừ thời gian với số phút
const subtractMinutesFromTime = (timeString, minutes) => {
  const totalMinutes = timeToMinutes(timeString) - minutes;
  return minutesToTime(totalMinutes);
};

// Kiểm tra thời gian có nằm trong khoảng không
const isTimeInRange = (time, startTime, endTime) => {
  const timeMinutes = timeToMinutes(time);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
};

// Lấy thời gian hiện tại theo format HH:mm
const getCurrentTime = () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Format thời gian từ Date object sang HH:mm
const formatDateToTime = (date) => {
  if (!date || !(date instanceof Date)) return null;

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Chuyển đổi thời gian từ HH:mm sang Date object (hôm nay)
const timeToDate = (timeString) => {
  if (!isValidTime(timeString)) return null;

  const [hours, minutes] = timeString.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Tính toán thời gian đi lại
const calculateTravelTime = (startTime, travelMinutes) => {
  return subtractMinutesFromTime(startTime, travelMinutes);
};

// Tính toán thời gian về
const calculateReturnTime = (endTime, travelMinutes) => {
  return addMinutesToTime(endTime, travelMinutes);
};

// Tìm giờ ăn gần nhất (trước hoặc sau) thời gian cho trước
const findNearestMeal = (time) => {
  const timeMinutes = timeToMinutes(time);
  const mealTimes = [
    { name: "breakfast", time: "06:00", minutes: 360 },
    { name: "lunch", time: "11:00", minutes: 660 },
    { name: "dinner", time: "17:30", minutes: 1050 },
  ];

  // Tìm giờ ăn gần nhất (trước hoặc sau)
  let nearestMeal = null;
  let minDistance = Infinity;

  for (const meal of mealTimes) {
    const distance = Math.abs(meal.minutes - timeMinutes);
    if (distance < minDistance) {
      minDistance = distance;
      nearestMeal = meal;
    } else if (distance === minDistance) {
      // Nếu khoảng cách bằng nhau, ưu tiên giờ ăn trước
      if (meal.minutes < timeMinutes) {
        nearestMeal = meal;
      }
    }
  }

  return nearestMeal;
};

// Kiểm tra xem có cần cắt cơm không dựa trên thời gian đi và về
const shouldCutMeal = (
  departureTime,
  returnTime,
  mealTime,
  startTime = null,
  endTime = null
) => {
  const departureMinutes = timeToMinutes(departureTime);
  const returnMinutes = timeToMinutes(returnTime);
  const mealMinutes = timeToMinutes(mealTime);

  console.log(
    `[DEBUG] shouldCutMeal: departureTime=${departureTime} (${departureMinutes}min), returnTime=${returnTime} (${returnMinutes}min), mealTime=${mealTime} (${mealMinutes}min)`
  );

  // Logic cơ bản: đi trước hoặc đúng giờ ăn và về sau hoặc đúng giờ ăn
  let result = departureMinutes <= mealMinutes && returnMinutes >= mealMinutes;

  // Logic đặc biệt cho bữa trưa (11:00)
  if (mealTime === "11:00" && startTime && endTime) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const lunchMinutes = timeToMinutes("11:00");

    // Nếu đang học đúng vào giờ trưa thì cũng cắt
    const isStudyingDuringLunch =
      startMinutes <= lunchMinutes && endMinutes >= lunchMinutes;
    result = result || isStudyingDuringLunch;

    console.log(
      `[DEBUG] Lunch special logic: startTime=${startTime} (${startMinutes}min), endTime=${endTime} (${endMinutes}min), isStudyingDuringLunch=${isStudyingDuringLunch}`
    );
  }

  console.log(`[DEBUG] shouldCutMeal result: ${result}`);

  return result;
};

// Lấy thông tin thời gian chi tiết
const getTimeInfo = (timeString) => {
  if (!isValidTime(timeString)) return null;

  const minutes = timeToMinutes(timeString);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return {
    original: timeString,
    minutes: minutes,
    hours: hours,
    minutesOnly: mins,
    formatted: `${hours.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}`,
  };
};

// Validate và format thời gian
const validateAndFormatTime = (timeString) => {
  if (!timeString) return null;

  // Nếu đã đúng format HH:mm
  if (isValidTime(timeString)) {
    return timeString;
  }

  // Nếu là số (phút)
  if (!isNaN(timeString)) {
    return minutesToTime(parseInt(timeString));
  }

  // Thử parse các format khác
  const time = timeString.toString().trim();

  // Format: "6:30" -> "06:30"
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [hours, minutes] = time.split(":");
    return `${hours.padStart(2, "0")}:${minutes}`;
  }

  // Format: "630" -> "06:30"
  if (/^\d{3,4}$/.test(time)) {
    const hours = Math.floor(parseInt(time) / 100);
    const minutes = parseInt(time) % 100;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  }

  return null;
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  formatMinutesToTime,
  formatTimeToMinutes,
  compareTime,
  isValidTime,
  getTimeDifference,
  addMinutesToTime,
  subtractMinutesFromTime,
  isTimeInRange,
  getCurrentTime,
  formatDateToTime,
  timeToDate,
  calculateTravelTime,
  calculateReturnTime,
  shouldCutMeal,
  getTimeInfo,
  validateAndFormatTime,
};
