const mongoose = require("mongoose");
const Wishlist = require("../models/wishlist");
const Sellbooks = require("../models/sellbooks");

const addToWishlist = async (req, res) => {
  try {
    const userId = req.userId;
    const { bookId } = req.body;

    console.log("[wishlistcontroller:addToWishlist] Request received", {
      userId: userId ? String(userId) : "",
      bookId: bookId || "",
    });

    if (!userId) {
      console.warn("[wishlistcontroller:addToWishlist] Unauthorized");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      console.warn("[wishlistcontroller:addToWishlist] Invalid bookId", {
        bookId,
      });
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const book = await Sellbooks.findById(bookId).select(
      "_id status soldstatus",
    );
    if (!book) {
      console.warn("[wishlistcontroller:addToWishlist] Book not found", {
        bookId,
      });
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.status !== "Accepted" || book.soldstatus === "Soldout") {
      console.warn("[wishlistcontroller:addToWishlist] Book not available", {
        bookId,
        status: book.status,
        soldstatus: book.soldstatus,
      });
      return res.status(400).json({
        success: false,
        message: "Only available accepted books can be added to wishlist",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, book: bookId });
    if (existing) {
      console.log(
        "[wishlistcontroller:addToWishlist] Book already in wishlist",
        {
          userId: String(userId),
          bookId,
        },
      );
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

    console.log("[wishlistcontroller:addToWishlist] Book added", {
      userId: String(userId),
      bookId,
      wishlistId: String(wishlistItem._id),
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

    console.log("[wishlistcontroller:removeFromWishlist] Request received", {
      userId: userId ? String(userId) : "",
      bookId: bookId || "",
    });

    if (!userId) {
      console.warn("[wishlistcontroller:removeFromWishlist] Unauthorized");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      console.warn("[wishlistcontroller:removeFromWishlist] Invalid bookId", {
        bookId,
      });
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
      console.warn(
        "[wishlistcontroller:removeFromWishlist] Book not found in wishlist",
        {
          userId: String(userId),
          bookId,
        },
      );
      return res.status(404).json({
        success: false,
        message: "Book not found in wishlist",
      });
    }

    console.log("[wishlistcontroller:removeFromWishlist] Book removed", {
      userId: String(userId),
      bookId,
    });

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

    console.log("[wishlistcontroller:getMyWishlist] Request received", {
      userId: userId ? String(userId) : "",
    });

    if (!userId) {
      console.warn("[wishlistcontroller:getMyWishlist] Unauthorized");
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

    console.log("[wishlistcontroller:getMyWishlist] Wishlist fetched", {
      userId: String(userId),
      totalItems: filteredWishlist.length,
    });

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

    console.log("[wishlistcontroller:isBookWishlisted] Request received", {
      userId: userId ? String(userId) : "",
      bookId: bookId || "",
    });

    if (!userId) {
      console.warn("[wishlistcontroller:isBookWishlisted] Unauthorized");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      console.warn("[wishlistcontroller:isBookWishlisted] Invalid bookId", {
        bookId,
      });
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

    console.log("[wishlistcontroller:toggleWishlist] Request received", {
      userId: userId ? String(userId) : "",
      bookId: bookId || "",
    });

    if (!userId) {
      console.warn("[wishlistcontroller:toggleWishlist] Unauthorized");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      console.warn("[wishlistcontroller:toggleWishlist] Invalid bookId", {
        bookId,
      });
      return res.status(400).json({
        success: false,
        message: "Valid bookId is required",
      });
    }

    const book = await Sellbooks.findById(bookId).select(
      "_id status soldstatus",
    );
    if (!book) {
      console.warn("[wishlistcontroller:toggleWishlist] Book not found", {
        bookId,
      });
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    if (book.status !== "Accepted" || book.soldstatus === "Soldout") {
      console.warn("[wishlistcontroller:toggleWishlist] Book not available", {
        bookId,
        status: book.status,
        soldstatus: book.soldstatus,
      });
      return res.status(400).json({
        success: false,
        message: "Only available accepted books can be wishlisted",
      });
    }

    const existing = await Wishlist.findOne({ user: userId, book: bookId });

    if (existing) {
      await Wishlist.deleteOne({ _id: existing._id });

      console.log("[wishlistcontroller:toggleWishlist] Book removed", {
        userId: String(userId),
        bookId,
      });

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

    console.log("[wishlistcontroller:toggleWishlist] Book added", {
      userId: String(userId),
      bookId,
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
