const mongoose = require("mongoose");
const Wishlist = require("../models/wishlist");
const Sellbooks = require("../models/sellbooks");

const addToWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const book = await Sellbooks.findById(bookId).select(
      "_id status soldstatus",
    );
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.status !== "Accepted" || book.soldstatus === "Soldout") {
      return res.status(400).json({
        success: false,
        message: "Only available accepted books can be added to wishlist",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, book: bookId });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Book already in wishlist",
        data: existing,
      });
    }

    const wishlistItem = await Wishlist.create({
      user: userId,
      book: bookId,
    });

    return res.status(201).json({
      success: true,
      message: "Book added to wishlist",
      data: wishlistItem,
    });
  } catch (error) {
    console.error("addToWishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to wishlist",
      error: error.message,
    });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const deleted = await Wishlist.findOneAndDelete({
      user: userId,
      book: bookId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Book not found in wishlist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book removed from wishlist",
    });
  } catch (error) {
    console.error("removeFromWishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove from wishlist",
      error: error.message,
    });
  }
};

const getMyWishlist = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const wishlist = await Wishlist.find({ user: userId })
      .populate({
        path: "book",
        select:
          "name image price updatedPrice pincode district condition categeory subcategeory status soldstatus",
      })
      .sort({ createdAt: -1 });

    const filteredWishlist = wishlist.filter(
      (item) =>
        item.book &&
        item.book.status === "Accepted" &&
        item.book.soldstatus !== "Soldout",
    );

    return res.status(200).json({
      success: true,
      count: filteredWishlist.length,
      wishlist: filteredWishlist,
    });
  } catch (error) {
    console.error("getMyWishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
      error: error.message,
    });
  }
};

const isBookWishlisted = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const exists = await Wishlist.exists({
      user: userId,
      book: bookId,
    });

    return res.status(200).json({
      success: true,
      wishlisted: !!exists,
    });
  } catch (error) {
    console.error("isBookWishlisted error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check wishlist status",
      error: error.message,
    });
  }
};

const toggleWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const book = await Sellbooks.findById(bookId).select(
      "_id status soldstatus",
    );
    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.status !== "Accepted" || book.soldstatus === "Soldout") {
      return res.status(400).json({
        success: false,
        message: "Only available accepted books can be wishlisted",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, book: bookId });

    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });

      return res.status(200).json({
        success: true,
        action: "removed",
        message: "Book removed from wishlist",
        wishlisted: false,
      });
    }

    await Wishlist.create({
      user: userId,
      book: bookId,
    });

    return res.status(201).json({
      success: true,
      action: "added",
      message: "Book added to wishlist",
      wishlisted: true,
    });
  } catch (error) {
    console.error("toggleWishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle wishlist",
      error: error.message,
    });
  }
};

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
  isBookWishlisted,
  toggleWishlist,
};
