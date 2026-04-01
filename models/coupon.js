import mongoose from "mongoose";

const couponStatusSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    discountPercentage: {
      type: Number,
      required: true,
    },
    usedDate: {
      type: Date,
      default: null,
    },
    userName: {
      type: String,
      default: "",
      trim: true,
    },
    userEmail: {
      type: String,
      default: "",
      trim: true,
    },
    userMobile: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const Couponstatus =
  mongoose.models.Couponstatus ||
  mongoose.model("Couponstatus", couponStatusSchema);

export default Couponstatus;
