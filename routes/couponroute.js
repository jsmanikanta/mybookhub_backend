const express = require("express");
const { verifyCoupon } = require("../controllers/couponstatus");
const { verifyToken } = require("../verifyToken");

const router = express.Router();

router.post("/verify", verifyToken, verifyCoupon);

module.exports = router;