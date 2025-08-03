const mongoose = require("mongoose");

const timeTableSchema = mongoose.model(
  "time_table",
  new mongoose.Schema({
    day: {
      type: String,
      required: true,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
    schoolWeek: String,
    // Thời gian bắt đầu môn học (HH:mm format)
    startTime: {
      type: String,
      required: true,
    },
    // Thời gian kết thúc môn học (HH:mm format)
    endTime: {
      type: String,
      required: true,
    },
    classroom: String,
    // Thông tin môn học
    subject: {
      type: String,
      required: true,
    },
    // Ghi chú
    notes: String,
    // Trạng thái (active/inactive)
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports = timeTableSchema;
