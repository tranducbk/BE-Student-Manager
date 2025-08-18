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

    // Lấy student với achievement
    const student = await Student.findById(user.student._id).populate(
      "achievement"
    );
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    let achievement = student.achievement;
    if (!achievement) {
      // Tạo achievement mới nếu chưa có
      achievement = new Achievement({
        studentId: student._id,
        yearlyAchievements: [],
      });
      await achievement.save();

      // Cập nhật reference trong student
      student.achievement = achievement._id;
      await student.save();
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
    const students = await Student.find()
      .populate("achievement")
      .populate({ path: "class", select: "className" })
      .select("_id fullName unit studentId achievement class");
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

    console.log("Adding achievement for studentId:", studentId);
    console.log("Request body:", req.body);
    console.log("Year from request:", year, "Type:", typeof year);

    // Kiểm tra student có tồn tại không
    const student = await Student.findById(studentId).populate("achievement");
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    let achievement = student.achievement;
    if (!achievement) {
      // Tạo achievement mới nếu chưa có
      achievement = new Achievement({
        studentId: studentId,
        yearlyAchievements: [],
      });
      await achievement.save();

      // Cập nhật reference trong student
      student.achievement = achievement._id;
      await student.save();
    }

    console.log("Current achievement:", achievement);
    console.log("Existing achievements:", achievement.yearlyAchievements);

    // Kiểm tra xem năm đã có khen thưởng chưa
    const existingYearIndex = achievement.yearlyAchievements.findIndex(
      (a) => a.year === parseInt(year)
    );
    console.log("Existing year index:", existingYearIndex);

    if (existingYearIndex !== -1) {
      // Nếu năm đã có khen thưởng, báo lỗi
      console.log("Year already exists:", year);
      return res.status(400).json({
        message: `Năm ${year} đã có khen thưởng, không thể thêm mới`,
      });
    } else {
      // Nếu năm chưa có khen thưởng, thêm mới
      console.log("Adding new achievement for year:", year);
      const newAchievement = {
        year: parseInt(year),
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
    }

    // Tính toán lại thống kê
    await calculateAchievementStats(achievement);

    await achievement.save();

    return res.status(201).json({
      achievement,
      message: "Thêm khen thưởng thành công",
      action: "create",
    });
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

    // ===== Bổ sung logic đề xuất (suggestions) =====
    const suggestions = [];
    // Điều kiện 1: 1 năm CSTD + có đề tài/sáng kiến
    if (
      achievement.totalCompetitiveSoldier === 1 &&
      (achievement.totalScientificTopics > 0 ||
        achievement.totalScientificInitiatives > 0)
    ) {
      suggestions.push(
        "Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận bằng khen Bộ Quốc Phòng"
      );
    }
    // Điều kiện 2: 2 năm CSTD liên tiếp, chưa có đề tài/sáng kiến
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears === 2 &&
      achievement.totalCompetitiveSoldier >= 2 &&
      achievement.totalScientificTopics === 0 &&
      achievement.totalScientificInitiatives === 0
    ) {
      suggestions.push(
        "Cần thêm 1 đề tài hoặc sáng kiến khoa học để đủ điều kiện nhận bằng khen Bộ Quốc Phòng"
      );
    }
    // Điều kiện 3: 2 năm CSTD liên tiếp + có đề tài/sáng kiến, chưa có bằng khen bộ quốc phòng
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears === 2 &&
      achievement.totalCompetitiveSoldier >= 2 &&
      (achievement.totalScientificTopics > 0 ||
        achievement.totalScientificInitiatives > 0) &&
      !achievement.eligibleForMinistryReward
    ) {
      suggestions.push("Đã đủ điều kiện nhận bằng khen Bộ Quốc Phòng");
      // Nếu chưa đủ 3 năm liên tiếp thì đề xuất thêm 1 năm nữa để đạt toàn quân
      if (achievement.nextYearRecommendations.yearsToNationalReward === 1) {
        suggestions.push(
          "Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận CSTĐ Toàn Quân"
        );
      }
    }

    // Điều kiện mới: Cứ MỖI CỤM 3 NĂM CSTD liên tiếp (3, 6, ...), CHƯA có NCKH => đề xuất cần NCKH để nhận toàn quân
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears > 0 &&
      achievement.nextYearRecommendations.consecutiveCompetitiveYears % 3 ===
        0 &&
      achievement.totalScientificTopics === 0 &&
      achievement.totalScientificInitiatives === 0 &&
      !achievement.eligibleForNationalReward
    ) {
      suggestions.push(
        "Cần có đề tài hoặc sáng kiến khoa học để đủ điều kiện nhận CSTĐ Toàn Quân"
      );
    }

    return res.status(200).json({
      ...recommendations,
      suggestions,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy đề xuất khen thưởng cho admin theo studentId
const getRecommendationsByStudentId = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    const achievement = await Achievement.findOne({
      studentId: studentId,
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

    // ===== Bổ sung logic đề xuất (suggestions) =====
    const suggestions = [];
    // Điều kiện 1: 1 năm CSTD + có đề tài/sáng kiến
    if (
      achievement.totalCompetitiveSoldier === 1 &&
      (achievement.totalScientificTopics > 0 ||
        achievement.totalScientificInitiatives > 0)
    ) {
      suggestions.push(
        "Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận bằng khen Bộ Quốc Phòng"
      );
    }
    // Điều kiện 2: 2 năm CSTD liên tiếp, chưa có đề tài/sáng kiến
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears === 2 &&
      achievement.totalCompetitiveSoldier >= 2 &&
      achievement.totalScientificTopics === 0 &&
      achievement.totalScientificInitiatives === 0
    ) {
      suggestions.push(
        "Cần thêm 1 đề tài hoặc sáng kiến khoa học để đủ điều kiện nhận bằng khen Bộ Quốc Phòng"
      );
    }
    // Điều kiện 3: 2 năm CSTD liên tiếp + có đề tài/sáng kiến, chưa có bằng khen bộ quốc phòng
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears === 2 &&
      achievement.totalCompetitiveSoldier >= 2 &&
      (achievement.totalScientificTopics > 0 ||
        achievement.totalScientificInitiatives > 0) &&
      !achievement.eligibleForMinistryReward
    ) {
      suggestions.push("Đã đủ điều kiện nhận bằng khen Bộ Quốc Phòng");
      // Nếu chưa đủ 3 năm liên tiếp thì đề xuất thêm 1 năm nữa để đạt toàn quân
      if (achievement.nextYearRecommendations.yearsToNationalReward === 1) {
        suggestions.push(
          "Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận CSTĐ Toàn Quân"
        );
      }
    }

    // Điều kiện 4: 2 năm CSTD liên tiếp + có đề tài/sáng kiến, đã đủ điều kiện bằng khen bộ quốc phòng
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears === 2 &&
      achievement.totalCompetitiveSoldier >= 2 &&
      (achievement.totalScientificTopics > 0 ||
        achievement.totalScientificInitiatives > 0) &&
      achievement.eligibleForMinistryReward &&
      !achievement.eligibleForNationalReward // Chưa đủ điều kiện CSTĐ Toàn Quân
    ) {
      suggestions.push("Đã đủ điều kiện nhận bằng khen Bộ Quốc Phòng");
      // Nếu chưa đủ 3 năm liên tiếp thì đề xuất thêm 1 năm nữa để đạt toàn quân
      if (achievement.nextYearRecommendations.yearsToNationalReward === 1) {
        suggestions.push(
          "Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận CSTĐ Toàn Quân"
        );
      }
    }

    // Điều kiện mới: MỖI CỤM 3 năm CSTD liên tiếp (3, 6, ...), chưa có NCKH => đề xuất cần NCKH để nhận CSTĐ Toàn Quân
    if (
      achievement.nextYearRecommendations.consecutiveCompetitiveYears > 0 &&
      achievement.nextYearRecommendations.consecutiveCompetitiveYears % 3 ===
        0 &&
      achievement.totalScientificTopics === 0 &&
      achievement.totalScientificInitiatives === 0 &&
      !achievement.eligibleForNationalReward
    ) {
      suggestions.push(
        "Cần có đề tài hoặc sáng kiến khoa học để đủ điều kiện nhận CSTĐ Toàn Quân"
      );
    }

    // Điều kiện 5: Đã đủ điều kiện CSTĐ Toàn Quân
    if (achievement.eligibleForNationalReward) {
      suggestions.push("Đã đủ điều kiện nhận CSTĐ Toàn Quân");
    }

    // Kiểm tra xem đã nhận bằng khen chưa
    const hasMinistryReward = achievement.yearlyAchievements.some(
      (ya) => ya.hasMinistryReward
    );
    const hasNationalReward = achievement.yearlyAchievements.some(
      (ya) => ya.hasNationalReward
    );

    // Nếu đã có CSTĐ Toàn Quân thì không đề xuất gì nữa
    if (hasNationalReward) {
      suggestions.length = 0; // Xóa tất cả suggestions
      suggestions.push("Đã có CSTĐ Toàn Quân - Không cần đề xuất thêm");
    }
    // Nếu đã có bằng khen bộ quốc phòng nhưng chưa có toàn quân
    else if (hasMinistryReward) {
      suggestions.length = 0; // Xóa tất cả suggestions
      suggestions.push(
        "Đã có bằng khen Bộ Quốc Phòng - Cần thêm 1 năm chiến sĩ thi đua để đủ điều kiện nhận CSTĐ Toàn Quân"
      );
    }

    return res.status(200).json({
      ...recommendations,
      suggestions,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy achievement theo studentId dành cho admin (dùng cho trang chi tiết)
const getAchievementByStudentIdAdmin = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId).populate("achievement");
    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy học viên" });
    }

    let achievement = student.achievement;
    if (!achievement) {
      achievement = new Achievement({
        studentId: studentId,
        yearlyAchievements: [],
      });
      await achievement.save();

      student.achievement = achievement._id;
      await student.save();
    }

    await calculateAchievementStats(achievement);

    return res.status(200).json(achievement);
  } catch (error) {
    console.error("Error getting achievement by studentId (admin):", error);
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
    (a) => a.title === "Chiến sĩ tiên tiến"
  ).length;

  achievement.totalCompetitiveSoldier = yearlyAchievements.filter(
    (a) => a.title === "Chiến sĩ thi đua"
  ).length;

  // Tính tổng đề tài và sáng kiến khoa học (chỉ tính những cái đã duyệt)
  let totalTopics = 0;
  let totalInitiatives = 0;

  yearlyAchievements.forEach((year) => {
    // Chỉ tính đề tài đã duyệt
    totalTopics += year.scientific.topics.filter(
      (topic) => topic.status === "approved"
    ).length;
    // Chỉ tính sáng kiến đã duyệt
    totalInitiatives += year.scientific.initiatives.filter(
      (initiative) => initiative.status === "approved"
    ).length;
  });

  achievement.totalScientificTopics = totalTopics;
  achievement.totalScientificInitiatives = totalInitiatives;

  // Kiểm tra tính liên tục của các năm chiến sĩ thi đua
  const competitiveYears = yearlyAchievements
    .filter((a) => a.title === "Chiến sĩ thi đua")
    .map((a) => a.year)
    .sort((a, b) => a - b);

  // Tìm chuỗi liên tục dài nhất và năm bắt đầu
  let maxConsecutiveCompetitive = 0;
  let currentConsecutive = 0;
  let consecutiveStartYear = 0;

  for (let i = 0; i < competitiveYears.length; i++) {
    if (i === 0 || competitiveYears[i] === competitiveYears[i - 1] + 1) {
      if (currentConsecutive === 0) {
        consecutiveStartYear = competitiveYears[i];
      }
      currentConsecutive++;
    } else {
      currentConsecutive = 1;
      consecutiveStartYear = competitiveYears[i];
    }
    maxConsecutiveCompetitive = Math.max(
      maxConsecutiveCompetitive,
      currentConsecutive
    );
  }

  const currentYear = Math.max(...yearlyAchievements.map((a) => a.year));
  const secondYearOfStreak = consecutiveStartYear + 1;
  const thirdYearOfStreak = consecutiveStartYear + 2;

  achievement.eligibleForMinistryReward =
    maxConsecutiveCompetitive >= 2 &&
    currentYear >= secondYearOfStreak &&
    (achievement.totalScientificTopics > 0 ||
      achievement.totalScientificInitiatives > 0);

  // Kiểm tra điều kiện CSTĐ Toàn Quân
  // (3 năm chiến sĩ thi đua LIÊN TIẾP + có đề tài nghiên cứu HOẶC sáng kiến đã duyệt)
  // Chỉ đủ điều kiện khi đã đến năm thứ 3 của chuỗi
  achievement.eligibleForNationalReward =
    maxConsecutiveCompetitive >= 3 &&
    currentYear >= thirdYearOfStreak &&
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
    canContinueStreak:
      nextYear === lastCompetitiveYear + 1 &&
      maxConsecutiveCompetitive % 3 !== 0,
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
  getRecommendationsByStudentId,
  getAchievementByStudentIdAdmin,
};
