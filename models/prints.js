const mongoose = require("mongoose");

const printSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    file: { type: String, required: true, trim: true },
    originalprice: { type: Number, required: true },
    discountprice: { type: Number, default: null },
    color: {
      type: String,
      enum: ["b/w", "colour"],
      required: true,
    },
    sides: {
      type: String,
      enum: ["1", "2", "2 per side", "4 per side"],
      required: true,
    },
    binding: {
      type: String,
      enum: ["none", "spiral", "stick", "soft", "book"],
      default: "none",
    },
    copies: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    address: { type: String, default: "" },
    college: { type: String, default: "" },
    year: { type: String, default: "" },
    section: { type: String, default: "" },
    rollno: { type: String, default: "" },
    description: { type: String, default: "" },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Pay on Delivery"],
      required: true,
      default: "Pay on Delivery",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    razorpayOrderId: {
      type: String,
      default: "",
    },
    razorpayPaymentId: {
      type: String,
      default: "",
    },
    razorpaySignature: {
      type: String,
      default: "",
    },
    transactionId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "Order placed",
        "Verified",
        "Ready to dispatch",
        "Out for delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Order placed",
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prints", printSchema);