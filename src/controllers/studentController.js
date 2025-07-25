const Student = require("../models/student");
const User = require("../models/user");
const TimeTable = require("../models/time_table");

const getStudent = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    res.status(200).json(student);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const updateStudent = async (req, res) => {
  try {
    const { fullName, studentId } = req.body;

    const existingStudent = await Student.findOne({
      $or: [{ fullName: fullName }, { studentId: studentId }],
    });

    if (existingStudent) {
      return res.status(400).json("Tên học viên hoặc ID học viên đã tồn tại");
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.studentId,
      req.body,
      { new: true }
    );

    if (!updatedStudent)
      return res.status(404).json("Không tìm thấy sinh viên");

    return res.status(200).json(updatedStudent);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const getTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.tuitionFee);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const addTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;
    const { totalAmount, semester, content, status } = req.body;

    const newTuitionFee = {
      totalAmount,
      semester,
      content,
      status,
    };

    student.tuitionFee.push(newTuitionFee);
    await student.save();

    return res.status(201).json(newTuitionFee);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getAchievement = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.achievement);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const getCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.cutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const createCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    if (!student.cutRice) {
      student.cutRice = [];
    }

    student.cutRice.push(req.body);
    await student.save();

    return res.status(201).json(student.cutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const cutRice = student.cutRice.id(req.params.cutRiceId);
    if (!cutRice) {
      return res.status(404).json({ message: "cutRice không tồn tại" });
    }

    cutRice.set(req.body);
    await student.save();

    return res.status(200).json(student.cutRice);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const deleteCutRice = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const cutRice = student.cutRice.id(req.params.cutRiceId);
    if (!cutRice) {
      return res.status(404).json({ message: "cutRice không tồn tại" });
    }

    cutRice.deleteOne();
    await student.save();

    return res.status(200).json(student.cutRice);
  } catch (error) {
    console.error("Error deleting cutRice:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

const getLearningInformation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    return res.status(200).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const addLearningInformation = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    student.learningInformation.push(req.body);
    await student.save();

    return res.status(201).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json(error);
  }
};

const getTimeTable = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "student",
      populate: {
        path: "timeTable",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const timeTables = student.timeTable;
    return res.json(timeTables);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const createTimeTable = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    if (!student.timeTable) {
      student.timeTable = [];
    }

    const timeTable = await TimeTable.create(req.body);
    student.timeTable.push(timeTable._id);
    await student.save();

    return res.status(201).json(timeTable);
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteTuitionFee = async (req, res) => {
  try {
    const { userId, feeId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    student.tuitionFee = student.tuitionFee.filter(
      (fee) => fee._id.toString() !== feeId
    );

    await student.save();

    return res
      .status(200)
      .json({ message: "Tuition fee đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteLearningInformation = async (req, res) => {
  try {
    const { userId, learnId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    student.learningInformation = student.learningInformation.filter(
      (learn) => learn._id.toString() !== learnId
    );

    await student.save();

    return res
      .status(200)
      .json({ message: "Learning Information đã được xóa thành công" });
  } catch (error) {
    return res.status(500).json("Lỗi server");
  }
};

const deleteTimeTable = async (req, res) => {
  try {
    const { userId, timeTableId } = req.params;

    const user = await User.findById(userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    if (!student) {
      return res.status(404).json({ message: "Không tìm thấy sinh viên" });
    }

    const timeTable = await TimeTable.findById(timeTableId);
    if (!timeTable) {
      return res.status(404).json({ message: "TimeTable không tồn tại" });
    }

    // Kiểm tra xem timeTableId có tồn tại trong student.timeTable hay không
    const index = student.timeTable.indexOf(timeTableId);
    if (index === -1) {
      return res
        .status(400)
        .json({ message: "TimeTable không thuộc sinh viên này" });
    }

    // Xóa timeTableId từ mảng student.timeTable
    student.timeTable.splice(index, 1);
    await student.save();

    // Xóa timeTable từ cơ sở dữ liệu
    await TimeTable.deleteOne({ _id: timeTableId });

    return res
      .status(200)
      .json({ message: "TimeTable đã được xóa thành công" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateTuitionFee = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const tuitionFee = student.tuitionFee.id(req.params.tuitionFeeId);
    if (!tuitionFee) {
      return res.status(404).json({ message: "tuitionFee không tồn tại" });
    }

    tuitionFee.set(req.body);
    await student.save();

    return res.status(200).json(student.tuitionFee);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateTimeTable = async (req, res) => {
  try {
    const updatedTimeTable = await TimeTable.findByIdAndUpdate(
      req.params.timeTableId,
      req.body
    );

    if (!updatedTimeTable) {
      return res.status(404).json({ message: "timeTable không tồn tại" });
    }

    return res.status(200).json(updatedTimeTable);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const updateLearningResult = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("student");

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng" });
    }

    const student = user.student;

    const learningResult = student.learningInformation.id(req.params.learnId);
    if (!learningResult) {
      return res.status(404).json({ message: "learningResult không tồn tại" });
    }

    learningResult.set(req.body);
    await student.save();

    return res.status(200).json(student.learningInformation);
  } catch (error) {
    return res.status(500).json({ message: "Lỗi server" });
  }
};

module.exports = {
  updateStudent,
  getStudent,
  addTuitionFee,
  getAchievement,
  getCutRice,
  createCutRice,
  updateCutRice,
  deleteCutRice,
  getTuitionFee,
  getLearningInformation,
  addLearningInformation,
  getTimeTable,
  createTimeTable,
  deleteTuitionFee,
  deleteLearningInformation,
  deleteTimeTable,
  updateTuitionFee,
  updateTimeTable,
  updateLearningResult,
};
