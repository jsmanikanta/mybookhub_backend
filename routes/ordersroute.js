const express = require("express");
const multer = require("multer");
const router = express.Router();

const { verifyToken } = require("../verifyToken");
const { orderPrint, cancelOrder } = require("../controllers/orderprints");
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/orderprints",
  verifyToken,
  upload.fields([{ name: "file", maxCount: 1 }]),
  orderPrint,
);
router.patch("/cancelorder/:orderId", verifyToken, cancelOrder);
module.exports = router;