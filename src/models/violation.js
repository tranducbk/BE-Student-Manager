const mongoose = require("mongoose");

const violationSchema = mongoose.model(
  "Violation",
  new mongoose.Schema({
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    dateOfViolation: {
      type: Date,
      required: true,
    },
    penalty: String,
    year: {
      type: Number,
      required: true,
    },
    semester: {
      type: Number,
      enum: [1, 2],
    },
    severity: {
      type: String,
      enum: ["nhẹ", "trung bình", "nặng", "rất nặng"],
      default: "trung bình",
    },
    status: {
      type: String,
      enum: ["chưa xử lý", "đang xử lý", "đã xử lý", "đã hủy"],
      default: "chưa xử lý",
    },
    notes: String,
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

module.exports = violationSchema;
