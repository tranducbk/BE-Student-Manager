const mongoose = require("mongoose");

const StudentNotificationsSchema = mongoose.model(
  "student_notifications",
  new mongoose.Schema({
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "regulatory_document",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  })
);

module.exports = StudentNotificationsSchema;
