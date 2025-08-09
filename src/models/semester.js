const mongoose = require("mongoose");

const semesterSchema = mongoose.model(
  "semester",
  new mongoose.Schema({
    // Mã kỳ dạng 2023.2 hoặc 2024.1
    code: { type: String, required: true, unique: true },

    // Năm học hiển thị, ví dụ: "2023-2024"
    schoolYear: { type: String, required: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);

module.exports = semesterSchema;
