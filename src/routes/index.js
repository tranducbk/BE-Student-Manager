const router = require("express").Router();
const userRouter = require("./userRouter");
const studentRouter = require("./studentRouter");
const commanderRouter = require("./commanderRouter");
const universityRouter = require("./universityRouter");
const achievementRouter = require("./achievementRouter");
const violationRouter = require("./violationRouter");
const timeRouter = require("./timeRouter");
const gradeRouter = require("./gradeRouter");
const semesterRouter = require("./semesterRouter");

router.use("/user", userRouter);
router.use("/student", studentRouter);
router.use("/commander", commanderRouter);
router.use("/university", universityRouter);
router.use("/achievement", achievementRouter);
router.use("/violation", violationRouter);
router.use("/time", timeRouter);
router.use("/grade", gradeRouter);
router.use("/semester", semesterRouter);

module.exports = router;
