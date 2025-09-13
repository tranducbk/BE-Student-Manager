const Semester = require("../models/semester");
const RegulatoryDocument = require("../models/regulatory_document");
const Student = require("../models/student");
const StudentNotifications = require("../models/student_notifications");

// GET /semester
const getAllSemesters = async (req, res) => {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      const regex = new RegExp(q, "i");
      filter = { $or: [{ code: regex }, { schoolYear: regex }] };
    }
    const semesters = await Semester.find(filter).sort({ createdAt: -1 });
    return res.status(200).json(semesters);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

// GET /semester/:id
const getSemesterById = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = await Semester.findById(id);
    if (!semester)
      return res.status(404).json({ message: "Không tìm thấy kỳ" });
    return res.status(200).json(semester);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

// POST /semester/create
const createSemester = async (req, res) => {
  try {
    const { code, schoolYear } = req.body;
    if (!code || !schoolYear) {
      return res
        .status(400)
        .json({ message: "Thiếu dữ liệu bắt buộc (code, schoolYear)" });
    }
    const exists = await Semester.findOne({ code, schoolYear });
    if (exists)
      return res.status(409).json({
        message: `Học kỳ ${exists.code} - ${exists.schoolYear} đã tồn tại. Vui lòng kiểm tra lại.`,
      });

    const semester = await Semester.create({ code, schoolYear });

    // Broadcast thông báo tới học viên dựa trên cơ chế RegulatoryDocument
    try {
      const term = String(code).split(".")[1] || "";
      const termLabel = term ? `HK${term}` : code; // đồng bộ định dạng HK1/HK2/HK3
      const doc = await RegulatoryDocument.create({
        title: `Thông báo học kỳ mới ${termLabel} năm học ${schoolYear}`,
        content: `Học kỳ ${termLabel} - ${schoolYear} đã được tạo. Vui lòng kiểm tra thông tin học tập và đăng ký theo quy định.`,
        dateIssued: new Date(),
        author: req.user?.id || "system",
      });

      const students = await Student.find({}, { _id: 1 });
      if (students && students.length > 0) {
        const notiDocs = students.map((s) => ({
          studentId: s._id,
          notificationId: doc._id,
        }));
        await StudentNotifications.insertMany(notiDocs);
      }
    } catch (notifyErr) {
      console.error("Semester notify error:", notifyErr?.message || notifyErr);
    }

    return res.status(201).json({
      ...semester.toObject(),
      message: `Đã tạo học kỳ ${semester.code} - ${semester.schoolYear}`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

// PUT /semester/:id
const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, schoolYear } = req.body;
    const update = {};
    if (code) update.code = code;
    if (schoolYear) update.schoolYear = schoolYear;
    update.updatedAt = new Date();

    if (code && schoolYear) {
      // ensure unique code and schoolYear combination
      const exists = await Semester.findOne({
        code,
        schoolYear,
        _id: { $ne: id },
      });
      if (exists)
        return res.status(409).json({
          message: `Học kỳ ${exists.code} - ${exists.schoolYear} đã tồn tại. Vui lòng kiểm tra lại.`,
        });
    }

    const semester = await Semester.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!semester)
      return res.status(404).json({ message: "Không tìm thấy kỳ" });
    return res.status(200).json({
      ...semester.toObject(),
      message: `Đã cập nhật học kỳ ${semester.code} - ${semester.schoolYear}`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

// DELETE /semester/:id
const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const semester = await Semester.findByIdAndDelete(id);
    if (!semester)
      return res.status(404).json({ message: "Không tìm thấy kỳ" });
    return res.status(200).json({
      message: `Đã xóa học kỳ ${semester.code} - ${semester.schoolYear}`,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

module.exports = {
  getAllSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
};
