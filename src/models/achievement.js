const mongoose = require("mongoose");

// Schema cho sáng kiến khoa học
const scientificInitiativeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

// Schema cho đề tài khoa học
const scientificTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
});

// Schema cho khen thưởng theo năm
const yearlyAchievementSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  decisionNumber: {
    type: String,
    required: true,
  },
  decisionDate: {
    type: Date,
    required: true,
  },
  title: {
    type: String,
    enum: ["chiến sĩ tiên tiến", "chiến sĩ thi đua"],
    required: true,
  },
  scientific: {
    initiatives: [scientificInitiativeSchema], // Sáng kiến khoa học
    topics: [scientificTopicSchema], // Đề tài khoa học
  },
  hasMinistryReward: {
    type: Boolean,
    default: false,
  }, // Khen thưởng bộ quốc phòng (2 năm chiến sĩ thi đua + đề tài khoa học)
  hasNationalReward: {
    type: Boolean,
    default: false,
  }, // Bằng khen chiến sĩ thi đua toàn quân (3 năm chiến sĩ thi đua + đề tài nghiên cứu)
  notes: String,
});

// Schema chính cho achievement
const achievementSchema = mongoose.model(
  "Achievement",
  new mongoose.Schema({
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    yearlyAchievements: [yearlyAchievementSchema],
    totalYears: {
      type: Number,
      default: 0,
    },
    totalAdvancedSoldier: {
      type: Number,
      default: 0, // Tổng số năm chiến sĩ tiên tiến
    },
    totalCompetitiveSoldier: {
      type: Number,
      default: 0, // Tổng số năm chiến sĩ thi đua
    },
    totalScientificTopics: {
      type: Number,
      default: 0, // Tổng số đề tài khoa học
    },
    totalScientificInitiatives: {
      type: Number,
      default: 0, // Tổng số sáng kiến khoa học
    },
    // Các trạng thái đạt được
    eligibleForMinistryReward: {
      type: Boolean,
      default: false, // Đủ điều kiện khen thưởng bộ quốc phòng
    },
    eligibleForNationalReward: {
      type: Boolean,
      default: false, // Đủ điều kiện bằng khen toàn quân
    },
    // Thông tin đề xuất cho năm tiếp theo
    nextYearRecommendations: {
      needCompetitiveSoldier: {
        type: Boolean,
        default: false,
      },
      needScientificTopic: {
        type: Boolean,
        default: false,
      },
      yearsToMinistryReward: {
        type: Number,
        default: 0,
      },
      yearsToNationalReward: {
        type: Number,
        default: 0,
      },
      // Thông tin về chuỗi liên tục
      //   Số năm thi đua liên tiếp
      consecutiveCompetitiveYears: {
        type: Number,
        default: 0,
      },
      //   Năm thi đua cuối cùng
      lastCompetitiveYear: {
        type: Number,
        default: 0,
      },
      // Năm tiếp theo
      nextYear: {
        type: Number,
        default: 0,
      },
      // Có thể tiếp tục chuỗi thi đua
      canContinueStreak: {
        type: Boolean,
        default: false,
      },
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

module.exports = achievementSchema;
