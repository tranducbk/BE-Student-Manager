const Violation = require("../models/violation");
const Student = require("../models/student");
const User = require("../models/user");

// Lấy tất cả vi phạm của student
const getStudentViolations = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const violations = await Violation.find({
      studentId: user.student._id,
    }).sort({ dateOfViolation: -1 });

    return res.status(200).json(violations);
  } catch (error) {
    console.error("Error getting violations:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy vi phạm theo năm và học kỳ
const getViolationsByYearAndSemester = async (req, res) => {
  try {
    const { userId, year, semester } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const query = {
      studentId: user.student._id,
      year: parseInt(year),
    };

    if (semester) {
      query.semester = semester;
    }

    const violations = await Violation.find(query).sort({
      dateOfViolation: -1,
    });

    return res.status(200).json(violations);
  } catch (error) {
    console.error("Error getting violations by year and semester:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Thêm vi phạm mới (Admin)
const addViolation = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      content,
      dateOfViolation,
      penalty,
      year,
      semester,
      severity,
      status,
      notes,
    } = req.body;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const newViolation = new Violation({
      studentId: user.student._id,
      content,
      dateOfViolation: new Date(dateOfViolation),
      penalty,
      year,
      semester,
      severity,
      status,
      notes,
    });

    await newViolation.save();

    return res.status(201).json(newViolation);
  } catch (error) {
    console.error("Error adding violation:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Cập nhật vi phạm
const updateViolation = async (req, res) => {
  try {
    const { violationId } = req.params;
    const updateData = req.body;

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return res.status(404).json({ message: "Không tìm thấy vi phạm" });
    }

    // Cập nhật thời gian sửa đổi
    updateData.updatedAt = new Date();

    const updatedViolation = await Violation.findByIdAndUpdate(
      violationId,
      updateData,
      { new: true }
    );

    return res.status(200).json(updatedViolation);
  } catch (error) {
    console.error("Error updating violation:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Xóa vi phạm
const deleteViolation = async (req, res) => {
  try {
    const { violationId } = req.params;

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return res.status(404).json({ message: "Không tìm thấy vi phạm" });
    }

    await Violation.findByIdAndDelete(violationId);

    return res.status(200).json({ message: "Xóa vi phạm thành công" });
  } catch (error) {
    console.error("Error deleting violation:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy thống kê vi phạm theo năm
const getViolationStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate("student");
    if (!user || !user.student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const violations = await Violation.find({ studentId: user.student._id });

    // Thống kê theo năm
    const statsByYear = {};
    const statsBySeverity = {
      nhẹ: 0,
      "trung bình": 0,
      nặng: 0,
      "rất nặng": 0,
    };
    const statsByStatus = {
      "chưa xử lý": 0,
      "đang xử lý": 0,
      "đã xử lý": 0,
      "đã hủy": 0,
    };

    violations.forEach((violation) => {
      const year = violation.year;

      if (!statsByYear[year]) {
        statsByYear[year] = {
          total: 0,
          semester1: 0,
          semester2: 0,
          noSemester: 0,
        };
      }

      statsByYear[year].total++;

      if (violation.semester === "HK1") {
        statsByYear[year].semester1++;
      } else if (violation.semester === "HK2") {
        statsByYear[year].semester2++;
      } else {
        statsByYear[year].noSemester++;
      }

      // Thống kê theo mức độ
      if (statsBySeverity[violation.severity] !== undefined) {
        statsBySeverity[violation.severity]++;
      }

      // Thống kê theo trạng thái
      if (statsByStatus[violation.status] !== undefined) {
        statsByStatus[violation.status]++;
      }
    });

    const stats = {
      totalViolations: violations.length,
      statsByYear,
      statsBySeverity,
      statsByStatus,
      recentViolations: violations
        .sort(
          (a, b) => new Date(b.dateOfViolation) - new Date(a.dateOfViolation)
        )
        .slice(0, 5), // 5 vi phạm gần nhất
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error("Error getting violation stats:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

// Lấy tất cả vi phạm (cho admin)
const getAllViolations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      year,
      semester,
      severity,
      status,
    } = req.query;

    const query = {};

    if (year) query.year = parseInt(year);
    if (semester) query.semester = semester;
    if (severity) query.severity = severity;
    if (status) query.status = status;

    const violations = await Violation.find(query)
      .populate("studentId", "studentId fullName")
      .sort({ dateOfViolation: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Violation.countDocuments(query);

    return res.status(200).json({
      violations,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    console.error("Error getting all violations:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  getStudentViolations,
  getViolationsByYearAndSemester,
  addViolation,
  updateViolation,
  deleteViolation,
  getViolationStats,
  getAllViolations,
};
