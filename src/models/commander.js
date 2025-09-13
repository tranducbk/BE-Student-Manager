const mongoose = require("mongoose");

const commanderSchema = mongoose.model(
  "Commander",
  new mongoose.Schema({
    commanderId: String,
    fullName: String,
    gender: String,
    birthday: Date,
    placeOfBirth: String,
    hometown: String,
    ethnicity: String,
    religion: String,
    currentAddress: String,
    email: String,
    phoneNumber: String,
    cccd: String,
    partyCardNumber: String,
    startWork: Number,
    organization: String,
    unit: String,
    rank: String,
    positionGovernment: String,
    positionParty: String,
    fullPartyMember: Date,
    probationaryPartyMember: Date,
    dateOfEnlistment: Date,
    avatar: {
      type: String,
      default:
        "https://i.pinimg.com/736x/d4/a1/ff/d4a1ff9d0f243e50062e2b21f2f2496d.jpg",
    },
  })
);

module.exports = commanderSchema;
