const express = require("express");
const router = express.Router();

const {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  isBookWishlisted,
  toggleWishlist,
} = require("../controllers/wishlistcontroller");

const { verifyToken } = require("../verifyToken");

router.post("/add", verifyToken, addToWishlist);
router.delete("/remove/:bookId", verifyToken, removeFromWishlist);
router.get("/my", verifyToken, getMyWishlist);
router.get("/check/:bookId", verifyToken, isBookWishlisted);
router.post("/toggle", verifyToken, toggleWishlist);

module.exports = router;