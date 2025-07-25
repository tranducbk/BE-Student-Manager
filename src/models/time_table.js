const mongoose = require("mongoose");

const timeTableSchema = mongoose.model(
  "time_table",
  new mongoose.Schema({
    day: String,
    schoolWeek: String,
    time: String,
    classroom: String,
  })
);

module.exports = timeTableSchema;
