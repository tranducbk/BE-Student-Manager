const mongoose = require("mongoose");

const violationSchema = mongoose.model(
  "Violation",
  new mongoose.Schema({
    content: String,
    dateOfViolation: Date,
    penalty: String,
  })
);

module.exports = violationSchema;
