const router = require("express").Router();
const userRouter = require("./userRouter");
const studentRouter = require("./studentRouter");
const commanderRouter = require("./commanderRouter");

router.use("/user", userRouter);
router.use("/student", studentRouter);
router.use("/commander", commanderRouter);

module.exports = router;
