const mongoose = require("mongoose");

const helpCookingSchema = new mongoose.Schema({
  location: String,
  dayHelpCooking: Date,
});

const achievementSchema = new mongoose.Schema({
  semester: Number,
  schoolYear: String,
  content: String,
});

const tuitionFeeSchema = new mongoose.Schema({
  totalAmount: String,
  semester: String,
  content: String,
  status: String,
});

const physicalResultSchema = new mongoose.Schema({
  semester: String,
  run3000m: String,
  run100m: String,
  pullUpBar: Number,
  swimming100m: String,
  practise: String,
});

const learningInformationSchema = new mongoose.Schema({
  semester: String,
  CPA: Number,
  GPA: Number,
  cumulativeCredit: Number,
  studentLevel: Number,
  warningLevel: Number,
  totalDebt: Number,
  learningStatus: String,
});

const cutRiceSchema = new mongoose.Schema({
  monday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  tuesday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  wednesday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  thursday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  friday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  saturday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
  sunday: {
    breakfast: Boolean,
    lunch: Boolean,
    dinner: Boolean,
  },
});

const studentSchema = mongoose.model(
  "Student",
  new mongoose.Schema({
    studentId: { type: String, unique: true },
    fullName: { type: String, unique: true },
    gender: String,
    birthday: Date,
    hometown: String,
    email: String,
    phoneNumber: String,
    enrollment: Number,
    classUniversity: String,
    educationLevel: String,
    organization: String,
    university: String,
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
    timeTable: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "time_table",
      },
    ],
    violation: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Violation",
      },
    ],
    vacationSchedule: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "vacation_schedule",
      },
    ],
    helpCooking: [helpCookingSchema],
    achievement: [achievementSchema],
    tuitionFee: [tuitionFeeSchema],
    physicalResult: [physicalResultSchema],
    learningInformation: [learningInformationSchema],
    cutRice: [cutRiceSchema],
  })
);

module.exports = studentSchema;
