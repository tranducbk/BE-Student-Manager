const mongoose = require("mongoose");

const commanderDutyScheduleSchema = mongoose.model(
  "commander_duty_schedule",
  new mongoose.Schema({
    fullName: String,
    rank: String,
    phoneNumber: String,
    position: String,
    workDay: Date,
  })
);

module.exports = commanderDutyScheduleSchema;
