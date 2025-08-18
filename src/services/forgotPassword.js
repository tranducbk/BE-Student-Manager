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
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  CLIENT_URL,
} = require("../configs/index");

// Tạo transporter dựa trên cấu hình
const createTransporter = () => {
  // Nếu sử dụng Gmail
  if (EMAIL_SERVICE === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER, // chatgptplus.h5@gmail.com
        pass: EMAIL_PASS, // App Password của Gmail
      },
    });
  }

  // Nếu sử dụng SendGrid hoặc SMTP khác
  if (SMTP_HOST) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT || 587,
      secure: SMTP_SECURE === "true" || false,
      auth: {
        user: EMAIL_USER, // "apikey" cho SendGrid
        pass: EMAIL_PASS, // API Key của SendGrid
      },
    });
  }

  // Fallback cho development
  return nodemailer.createTransport({
    service: EMAIL_SERVICE || "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

const transporter = createTransporter();

const sendEmail = async (to, subject, htmlContent) => {
  // Xác định email người gửi
  let fromEmail = EMAIL_USER;

  // Nếu dùng SendGrid, sử dụng email đã verify
  if (SMTP_HOST && SMTP_HOST.includes("sendgrid")) {
    fromEmail = "chatgptplus.h5@gmail.com"; // Email đã verify trong SendGrid
  }

  const mailOptions = {
    from: fromEmail,
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
