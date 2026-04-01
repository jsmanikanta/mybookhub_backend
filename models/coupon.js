<<<<<<< HEAD
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
=======
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
>>>>>>> f85a39af7c7f6d11489c7715fab55327e17b35b3
