const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/user");
const Student = require("../models/student");
const Commander = require("../models/commander");

const Register = async (req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });

    if (existingUser)
      return res.status(400).json({ message: "Người dùng đã tồn tại" });

    let newUser;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    if (req.body.isAdmin) {
      const newCommander = new Commander();
      await newCommander.save();

      newUser = new User({
        username: req.body.username,
        password: hashedPassword,
        isAdmin: true,
        commander: newCommander._id,
      });
    } else {
      const newStudent = new Student();
      await newStudent.save();

      newUser = new User({
        username: req.body.username,
        password: hashedPassword,
        isAdmin: false,
        student: newStudent._id,
      });
    }

    await newUser.save();
    return res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error) {
    console.log("Đăng ký thất bại: ", error);
    return res.status(500).json({ message: "Đăng ký thất bại" });
  }
};

global.accessTokenList = [];
const Login = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return res.status(404).json("Tên đăng nhập không đúng");
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!validPassword) {
      return res.status(404).json("Mật khẩu không đúng");
    }

    const accessToken = jwt.sign(
      {
        id: user._id,
        admin: user.isAdmin,
      },
      process.env.JWT_ACCESS_KEY,
      {
        expiresIn: "2h",
      }
    );

    global.accessTokenList.push(accessToken);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "strict",
    });

    const { password, ...other } = user._doc;
    res.status(200).json({ other, accessToken });
  } catch (error) {
    res.status(500).json(error);
  }
};

const changePassword = async (req, res) => {
  try {
    if (req.body.newPassword !== req.body.confirmPassword) {
      return res.status(401).json("Xác nhận mật khẩu mới không đúng");
    }

    const users = await User.findById(req.params.userId);

    if (!users) {
      return res.status(404).json("Nguời dùng không tồn tại");
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      users.password
    );

    if (!validPassword) {
      return res.status(404).json("Mật khẩu cũ không đúng");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(req.body.newPassword, salt);

    const user = await User.findOneAndUpdate(
      { _id: req.params.userId },
      { password: hashedNewPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json("Người dùng không tồn tại");
    }

    return res
      .status(200)
      .json(`Cập nhật mật khẩu mới thành công cho user: ${user.username}`);
  } catch (error) {
    console.error(error);
    return res.status(500).json("Lỗi server");
  }
};

const Logout = async (req, res) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json("Đăng xuất thành công");
  } catch (error) {
    return res.status(500).json(error);
  }
};

module.exports = { Register, Login, Logout, changePassword };
