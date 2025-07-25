const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
require("dotenv").config();
const { PORT, MONGODB_ATLAS_URL } = require("./configs");
const app = express();

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

async function connect() {
  try {
    await mongoose.connect(MONGODB_ATLAS_URL);
    console.log("Đã kết nối tới MongoDB");
  } catch (error) {
    console.error("Lỗi kết nối MongoDB: ", error);
  }
}

connect();

app.use(require("./routes/index"));

app.listen(PORT, () => {
  console.log(`Máy chủ đang chạy trên cổng ${PORT}`);
});
