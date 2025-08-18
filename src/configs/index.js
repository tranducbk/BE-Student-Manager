module.exports = {
  PORT: process.env.PORT || 8080,
  MONGODB_ATLAS_URL: process.env.MONGODB_ATLAS_URL,
  JWT_ACCESS_KEY: process.env.JWT_ACCESS_KEY,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
};
