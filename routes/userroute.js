const express = require("express");
const router = express.Router();

const usercontrol = require("../controllers/usercontroller");
const { verifyToken } = require("../verifyToken");
const forgot = require("../controllers/forgotpassword");

router.post("/register", usercontrol.Register);
router.post("/login", usercontrol.login);
router.get("/printorders", verifyToken, usercontrol.getPrintsById);
router.post("/reset-password", forgot.resetPasswordWithoutOTP);
router.get("/profile", verifyToken, usercontrol.getProfile);
router.patch("/profile/update", verifyToken, usercontrol.updateProfile);
router.get("/mybooks", verifyToken, usercontrol.getBooksById);

module.exports = router;