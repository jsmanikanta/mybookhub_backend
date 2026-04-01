const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

const {
  getAllOrders,
  getAllBooks,
  updateStatus,
  updatePrintStatus,
  updatePaymentStatus,
  uploadBookCategoryImage,
  getBookCategoryImages,
} = require("../controllers/admin");

const upload = multer({
  storage: multer.memoryStorage(),
});

router.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// print orders
router.get("/printorders", getAllOrders);
router.put("/update-status/:orderId", updatePrintStatus);
router.put("/update-payment-status/:orderId", updatePaymentStatus);

// books
router.get("/books", getAllBooks);
router.patch("/book/:bookId/status", updateStatus);

// category images
router.post("/upload", upload.single("image"), uploadBookCategoryImage);
router.get("/add", getBookCategoryImages);

module.exports = router;