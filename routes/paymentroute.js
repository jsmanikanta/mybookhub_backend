const express = require("express");
const router = express.Router();
const { verifyToken } = require("../verifyToken");
const {
  createOrder,
  verifyPayment,
  paymentFailed,
} = require("../controllers/paymentcontroller");

router.post("/create-order", verifyToken, createOrder);
router.post("/verify-payment", verifyToken, verifyPayment);
router.post("/payment-failed", verifyToken, paymentFailed);

module.exports = router;