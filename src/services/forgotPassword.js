const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Student = require("../models/student");
require("dotenv").config();
const {
  JWT_ACCESS_KEY,
  EMAIL_SERVICE,
  EMAIL_USER,
  EMAIL_PASS,
  CLIENT_URL,
} = require("../configs/index");

const transporter = nodemailer.createTransport({
  service: EMAIL_SERVICE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error(`Không gửi được email: ${err}`);
    throw new Error("Không gửi được email");
  }
};

const forgotPassword = async (req, res) => {
  const student = await Student.findOne({ email: req.body.email });
  if (!student)
    return res.status(404).json("Email không tồn tại trong hệ thống!");

  const user = await User.findOne({ student: student._id });
  if (!user) return res.status(404).json("User không tồn tại");

  const token = jwt.sign({ id: user._id }, JWT_ACCESS_KEY, {
    expiresIn: "15m",
  });

  const htmlContent = `
    <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấp vào liên kết bên dưới để đặt lại mật khẩu của bạn:</p>
    <p>${CLIENT_URL}/reset-password/${token}</p>
  `;

  try {
    await sendEmail(student.email, "Yêu cầu đặt lại mật khẩu", htmlContent);
    return res.json("Đã gửi email đặt lại mật khẩu");
  } catch (err) {
    return res.status(500).json("Không gửi được email đặt lại mật khẩu");
  }
};

const resetPassword = async (req, res) => {
  const token = req.params.token;
  const { newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword)
    return res.status(400).json("Xác nhận mật khẩu không đúng!");

  let decoded = jwt.verify(token, JWT_ACCESS_KEY);
  const user = await User.findById(decoded.id);

  if (!user) {
    return res.status(404).json("User không tồn tại");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword;
  await user.save();

  return res.json("Mật khẩu đã được thay đổi thành công");
};

module.exports = { resetPassword, forgotPassword };
