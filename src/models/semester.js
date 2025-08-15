const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
  // Mã kỳ dạng HK1, HK2, HK3
  code: { type: String, required: true },

  // Năm học hiển thị, ví dụ: "2023-2024"
  schoolYear: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Tạo compound index để unique trên cả code và schoolYear
semesterSchema.index({ code: 1, schoolYear: 1 }, { unique: true });

const Semester = mongoose.model("semester", semesterSchema);

module.exports = Semester;
