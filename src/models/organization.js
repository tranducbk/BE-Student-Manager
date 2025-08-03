const mongoose = require("mongoose");

const organizationSchema = mongoose.model(
  "Organization",
  new mongoose.Schema({
    organizationName: {
      type: String,
      required: true,
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
    },
    // Thời gian đi lại từ khoa/viện về ký túc xá (phút)
    travelTime: {
      type: Number,
      default: 45, // Mặc định 45 phút
      required: true,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
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

module.exports = organizationSchema;
