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
  // Nếu sử dụng SendGrid (ưu tiên cao nhất)
  if (SMTP_HOST && SMTP_HOST.includes("sendgrid")) {
    console.log("Using SendGrid SMTP");
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true",
      auth: {
        user: "apikey", // Luôn là "apikey" cho SendGrid
        pass: EMAIL_PASS, // API Key của SendGrid
      },
    });
  }

  // Nếu sử dụng Gmail
  if (EMAIL_SERVICE === "gmail") {
    console.log("Using Gmail SMTP");
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  // Nếu sử dụng SMTP khác
  if (SMTP_HOST) {
    console.log("Using custom SMTP");
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true",
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }

  // Fallback - dùng Gmail
  console.log("Using fallback Gmail");
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

const transporter = createTransporter();

const sendEmail = async (to, subject, htmlContent) => {
  // Xác định email người gửi
  let fromEmail;

  if (SMTP_HOST && SMTP_HOST.includes("sendgrid")) {
    fromEmail = "chatgptplus.h5@gmail.com"; // Email đã verify trong SendGrid
  } else {
    fromEmail = EMAIL_USER; // Gmail hoặc email khác
  }

  const mailOptions = {
    from: fromEmail,
    to,
    subject,
    html: htmlContent,
  };

  try {
    console.log("Sending email to:", to);
    console.log("From:", fromEmail);
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return true;
  } catch (err) {
    console.error("Email error details:", err);
    throw new Error(`Không gửi được email: ${err.message}`);
  }
};

const forgotPassword = async (req, res) => {
  try {
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

    await sendEmail(student.email, "Yêu cầu đặt lại mật khẩu", htmlContent);
    return res.json("Đã gửi email đặt lại mật khẩu");
  } catch (err) {
    console.error("Forgot password error:", err);
    return res
      .status(500)
      .json(`Không gửi được email đặt lại mật khẩu: ${err.message}`);
  }
};

const resetPassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Reset password error:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).json("Token đã hết hạn, vui lòng yêu cầu lại");
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json("Token không hợp lệ");
    }
    return res.status(500).json("Có lỗi xảy ra khi đặt lại mật khẩu");
  }
};

module.exports = { resetPassword, forgotPassword };
