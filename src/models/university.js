const mongoose = require("mongoose");

const universitySchema = mongoose.model(
  "University",
  new mongoose.Schema({
    universityCode: {
      type: String,
      unique: true,
      required: true,
    },
    universityName: {
      type: String,
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

module.exports = universitySchema;
