const Achievement = require("../models/achievement");
const User = require("../models/user");
const Student = require("../models/student");

// Lấy thông tin khen thưởng của student
const getStudentAchievement = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    let achievement = await Achievement.findOne({
      studentId: user.student._id,
    });

    if (!achievement) {
      // Tạo achievement mới nếu chưa có
      achievement = new Achievement({
        studentId: user.student._id,
        yearlyAchievements: [],
      });
      await achievement.save();
    }

    // Tính toán lại các thống kê
    await calculateAchievementStats(achievement);

    return res.status(200).json(achievement);
  } catch (error) {
    console.error("Error getting achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách tất cả achievement cho admin
const getAllAchievements = async (req, res) => {
  try {
    const achievements = await Achievement.find().populate("studentId");
    return res.status(200).json(achievements);
  } catch (error) {
    console.error("Error getting all achievements:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy danh sách học viên cho admin
const getStudentsForAdmin = async (req, res) => {
  try {
    const students = await Student.find().select("_id fullName unit studentId");
    return res.status(200).json(students);
  } catch (error) {
    console.error("Error getting students:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm khen thưởng mới
const addYearlyAchievement = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, decisionNumber, decisionDate, title, scientific, notes } =
      req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    let achievement = await Achievement.findOne({
      studentId: user.student._id,
    });

    if (!achievement) {
      achievement = new Achievement({
        studentId: user.student._id,
        yearlyAchievements: [],
      });
    }

    // Kiểm tra xem năm đã có khen thưởng chưa
    const existingYear = achievement.yearlyAchievements.find(
      (a) => a.year === year
    );
    if (existingYear) {
      return res.status(400).json({ message: "Năm này đã có khen thưởng" });
    }

    // Thêm khen thưởng mới
    const newAchievement = {
      year,
      decisionNumber,
      decisionDate: new Date(decisionDate),
      title,
      scientific: {
        initiatives: scientific?.initiatives || [],
        topics: scientific?.topics || [],
      },
      notes,
    };

    achievement.yearlyAchievements.push(newAchievement);

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(201).json(achievement);
  } catch (error) {
    console.error("Error adding achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm khen thưởng cho admin (theo studentId)
const addYearlyAchievementByAdmin = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year, decisionNumber, decisionDate, title, scientific, notes } =
      req.body;

    let achievement = await Achievement.findOne({
      studentId: studentId,
    });

    if (!achievement) {
      achievement = new Achievement({
        studentId: studentId,
        yearlyAchievements: [],
      });
    }

    // Kiểm tra xem năm đã có khen thưởng chưa
    const existingYear = achievement.yearlyAchievements.find(
      (a) => a.year === year
    );
    if (existingYear) {
      return res.status(400).json({ message: "Năm này đã có khen thưởng" });
    }

    // Thêm khen thưởng mới
    const newAchievement = {
      year,
      decisionNumber,
      decisionDate: new Date(decisionDate),
      title,
      scientific: {
        initiatives: scientific?.initiatives || [],
        topics: scientific?.topics || [],
      },
      notes,
    };

    achievement.yearlyAchievements.push(newAchievement);

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(201).json(achievement);
  } catch (error) {
    console.error("Error adding achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật khen thưởng
const updateYearlyAchievement = async (req, res) => {
  try {
    const { userId, year } = req.params;
    const updateData = req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const achievement = await Achievement.findOne({
      studentId: user.student._id,
    });
    if (!achievement) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin khen thưởng" });
    }

    const yearIndex = achievement.yearlyAchievements.findIndex(
      (a) => a.year === parseInt(year)
    );
    if (yearIndex === -1) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy khen thưởng năm này" });
    }

    // Cập nhật dữ liệu
    Object.assign(achievement.yearlyAchievements[yearIndex], updateData);

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(200).json(achievement);
  } catch (error) {
    console.error("Error updating achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật khen thưởng cho admin
const updateYearlyAchievementByAdmin = async (req, res) => {
  try {
    const { studentId, year } = req.params;
    const updateData = req.body;

    const achievement = await Achievement.findOne({
      studentId: studentId,
    });
    if (!achievement) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin khen thưởng" });
    }

    const yearIndex = achievement.yearlyAchievements.findIndex(
      (a) => a.year === parseInt(year)
    );
    if (yearIndex === -1) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy khen thưởng năm này" });
    }

    // Cập nhật dữ liệu
    Object.assign(achievement.yearlyAchievements[yearIndex], updateData);

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(200).json(achievement);
  } catch (error) {
    console.error("Error updating achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa khen thưởng
const deleteYearlyAchievement = async (req, res) => {
  try {
    const { userId, year } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const achievement = await Achievement.findOne({
      studentId: user.student._id,
    });
    if (!achievement) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin khen thưởng" });
    }

    achievement.yearlyAchievements = achievement.yearlyAchievements.filter(
      (a) => a.year !== parseInt(year)
    );

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(200).json({ message: "Xóa khen thưởng thành công" });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa khen thưởng cho admin
const deleteYearlyAchievementByAdmin = async (req, res) => {
  try {
    const { studentId, year } = req.params;

    const achievement = await Achievement.findOne({
      studentId: studentId,
    });
    if (!achievement) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin khen thưởng" });
    }

    achievement.yearlyAchievements = achievement.yearlyAchievements.filter(
      (a) => a.year !== parseInt(year)
    );

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(200).json({ message: "Xóa khen thưởng thành công" });
  } catch (error) {
    console.error("Error deleting achievement:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy đề xuất khen thưởng cho năm tiếp theo
const getRecommendations = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const achievement = await Achievement.findOne({
      studentId: user.student._id,
    });
    if (!achievement) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin khen thưởng" });
    }

    // Tính toán lại thống kê và đề xuất
    await calculateAchievementStats(achievement);

    const recommendations = {
      currentStats: {
        totalYears: achievement.totalYears,
        totalAdvancedSoldier: achievement.totalAdvancedSoldier,
        totalCompetitiveSoldier: achievement.totalCompetitiveSoldier,
        totalScientificTopics: achievement.totalScientificTopics,
        totalScientificInitiatives: achievement.totalScientificInitiatives,
        consecutiveCompetitiveYears:
          achievement.nextYearRecommendations.consecutiveCompetitiveYears,
      },
      eligibleForMinistryReward: achievement.eligibleForMinistryReward,
      eligibleForNationalReward: achievement.eligibleForNationalReward,
      nextYearRecommendations: achievement.nextYearRecommendations,
      missingRequirements: {
        ministryReward: {
          needCompetitiveSoldier: Math.max(
            0,
            2 - achievement.nextYearRecommendations.consecutiveCompetitiveYears
          ),
          needScientificTopic:
            achievement.totalScientificTopics === 0 &&
            achievement.totalScientificInitiatives === 0
              ? 1
              : 0,
        },
        nationalReward: {
          needCompetitiveSoldier: Math.max(
            0,
            3 - achievement.nextYearRecommendations.consecutiveCompetitiveYears
          ),
          needScientificTopic:
            achievement.totalScientificTopics === 0 &&
            achievement.totalScientificInitiatives === 0
              ? 1
              : 0,
        },
      },
      // Thông tin chi tiết về chuỗi liên tục
      streakInfo: {
        consecutiveCompetitiveYears:
          achievement.nextYearRecommendations.consecutiveCompetitiveYears,
        lastCompetitiveYear:
          achievement.nextYearRecommendations.lastCompetitiveYear,
        nextYear: achievement.nextYearRecommendations.nextYear,
        canContinueStreak:
          achievement.nextYearRecommendations.canContinueStreak,
        message: achievement.nextYearRecommendations.canContinueStreak
          ? `Năm ${achievement.nextYearRecommendations.nextYear} có thể tiếp tục chuỗi liên tục`
          : `Cần đạt chiến sĩ thi đua năm ${achievement.nextYearRecommendations.nextYear} để bắt đầu chuỗi mới`,
        scientificRequirement:
          achievement.totalScientificTopics === 0 &&
          achievement.totalScientificInitiatives === 0
            ? "Cần có đề tài khoa học HOẶC sáng kiến khoa học"
            : "Đã đủ điều kiện về khoa học (có đề tài hoặc sáng kiến)",
      },
    };

    return res.status(200).json(recommendations);
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Hàm tính toán thống kê và đề xuất
const calculateAchievementStats = async (achievement) => {
  const yearlyAchievements = achievement.yearlyAchievements;

  // Tính tổng các năm
  achievement.totalYears = yearlyAchievements.length;

  // Tính số năm chiến sĩ tiên tiến và thi đua
  achievement.totalAdvancedSoldier = yearlyAchievements.filter(
    (a) => a.title === "chiến sĩ tiên tiến"
  ).length;

  achievement.totalCompetitiveSoldier = yearlyAchievements.filter(
    (a) => a.title === "chiến sĩ thi đua"
  ).length;

  // Tính tổng đề tài và sáng kiến khoa học
  let totalTopics = 0;
  let totalInitiatives = 0;

  yearlyAchievements.forEach((year) => {
    totalTopics += year.scientific.topics.length;
    totalInitiatives += year.scientific.initiatives.length;
  });

  achievement.totalScientificTopics = totalTopics;
  achievement.totalScientificInitiatives = totalInitiatives;

  // Kiểm tra tính liên tục của các năm chiến sĩ thi đua
  const competitiveYears = yearlyAchievements
    .filter((a) => a.title === "chiến sĩ thi đua")
    .map((a) => a.year)
    .sort((a, b) => a - b);

  // Tìm chuỗi liên tục dài nhất
  let maxConsecutiveCompetitive = 0;
  let currentConsecutive = 0;

  for (let i = 0; i < competitiveYears.length; i++) {
    if (i === 0 || competitiveYears[i] === competitiveYears[i - 1] + 1) {
      currentConsecutive++;
    } else {
      currentConsecutive = 1;
    }
    maxConsecutiveCompetitive = Math.max(
      maxConsecutiveCompetitive,
      currentConsecutive
    );
  }

  // Kiểm tra điều kiện khen thưởng bộ quốc phòng
  // (2 năm chiến sĩ thi đua LIÊN TIẾP + có đề tài khoa học HOẶC sáng kiến)
  achievement.eligibleForMinistryReward =
    maxConsecutiveCompetitive >= 2 &&
    (achievement.totalScientificTopics > 0 ||
      achievement.totalScientificInitiatives > 0);

  // Kiểm tra điều kiện bằng khen toàn quân
  // (3 năm chiến sĩ thi đua LIÊN TIẾP + có đề tài nghiên cứu HOẶC sáng kiến)
  achievement.eligibleForNationalReward =
    maxConsecutiveCompetitive >= 3 &&
    (achievement.totalScientificTopics > 0 ||
      achievement.totalScientificInitiatives > 0);

  // Tính đề xuất cho năm tiếp theo
  const nextYear = Math.max(...yearlyAchievements.map((a) => a.year)) + 1;
  const lastCompetitiveYear = Math.max(...competitiveYears, 0);

  achievement.nextYearRecommendations = {
    needCompetitiveSoldier: maxConsecutiveCompetitive < 3,
    needScientificTopic:
      achievement.totalScientificTopics === 0 &&
      achievement.totalScientificInitiatives === 0,
    yearsToMinistryReward: Math.max(0, 2 - maxConsecutiveCompetitive),
    yearsToNationalReward: Math.max(0, 3 - maxConsecutiveCompetitive),
    // Thông tin chi tiết về chuỗi liên tục
    consecutiveCompetitiveYears: maxConsecutiveCompetitive,
    lastCompetitiveYear: lastCompetitiveYear,
    nextYear: nextYear,
    // Nếu năm tiếp theo là năm liên tục với chuỗi hiện tại
    canContinueStreak: nextYear === lastCompetitiveYear + 1,
  };

  await achievement.save();
};

module.exports = {
  getStudentAchievement,
  getAllAchievements,
  getStudentsForAdmin,
  addYearlyAchievement,
  addYearlyAchievementByAdmin,
  updateYearlyAchievement,
  updateYearlyAchievementByAdmin,
  deleteYearlyAchievement,
  deleteYearlyAchievementByAdmin,
  getRecommendations,
};
