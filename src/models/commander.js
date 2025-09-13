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
        "https://i.pinimg.com/564x/24/21/85/242185eaef43192fc3f9646932fe3b46.jpg",
    },
  })
);

module.exports = commanderSchema;
