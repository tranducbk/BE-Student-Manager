const mongoose = require("mongoose");

const timeTableSchema = mongoose.model(
  "time_table",
  new mongoose.Schema({
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true, // Mỗi sinh viên chỉ có 1 bản ghi timeTable
    },
    schedules: [
      {
        day: {
          type: String,
          required: true,
          enum: [
            "Thứ 2",
            "Thứ 3",
            "Thứ 4",
            "Thứ 5",
            "Thứ 6",
            "Thứ 7",
            "Chủ nhật",
          ],
        },
        schoolWeek: String,
        startTime: {
          type: String,
          required: true,
        },
        endTime: {
          type: String,
          required: true,
        },
        time: {
          type: String,
          required: true,
        },
        classroom: String,
        subject: {
          type: String,
          required: true,
        },
        notes: String,
      },
    ],
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
