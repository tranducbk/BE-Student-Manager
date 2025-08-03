const mongoose = require("mongoose");

const classSchema = mongoose.model(
  "Class",
  new mongoose.Schema({
    className: {
      type: String,
      required: true,
    },
    educationLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "education_level",
      required: true,
    },
    studentCount: {
      type: Number,
      default: 0,
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

module.exports = classSchema;
