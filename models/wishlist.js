const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sellbooks",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index({ user: 1, book: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);