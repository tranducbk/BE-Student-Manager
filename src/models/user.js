const mongoose = require("mongoose");

const userSchema = mongoose.model(
  "User",
  new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
    commander: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Commander",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  })
);

module.exports = userSchema;
