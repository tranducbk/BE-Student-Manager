const mongoose = require("mongoose");

const guardSchema = mongoose.model(
  "Guard",
  new mongoose.Schema({
    dayGuard: Date,
    guardPassword: {
      question: String,
      answer: String,
    },
    location1: Array,
    location2: Array,
    location3: Array,
  })
);

module.exports = guardSchema;
