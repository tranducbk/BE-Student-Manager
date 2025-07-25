const mongoose = require("mongoose");

const vacationScheduleSchema = mongoose.model(
  "vacation_schedule",
  new mongoose.Schema({
    reason: String,
    address: String,
    time: String,
    dayoff: Date,
  })
);

module.exports = vacationScheduleSchema;
