const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers.token;
  if (token) {
    const accessToken = token.split(" ")[1];
    if (!accessTokenList.includes(accessToken)) {
      return res.status(403).json("Token không hợp lệ");
    }
    jwt.verify(accessToken, process.env.JWT_ACCESS_KEY, (err, user) => {
      if (err) {
        return res.status(403).json("Token không hợp lệ");
      }
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("Bạn chưa đăng nhập");
  }
};

const isAdmin = (req, res, next) => {
  const token = req.headers.token;

  if (!token) return res.status(401).json("Không tìm thấy token");

  jwt.verify(token.split(" ")[1], process.env.JWT_ACCESS_KEY, (err, user) => {
    if (err) return res.status(401).json("Token không hợp lệ");
    if (user.admin === true) next();
    else return res.status(403).json("Không có quyền");
  });
};

module.exports = { verifyToken, isAdmin };
