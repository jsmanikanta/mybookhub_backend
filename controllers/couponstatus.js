const mongoose = require("mongoose");
const Couponstatus = require("../models/coupon");
const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const verifyCoupon = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not ready",
      });
    }

    const userId = req.userId || req.user?._id || req.user?.id;
    const name = req.user?.fullname || req.user?.name || "";
    const email = req.user?.email || "";
    const mobile = req.user?.mobileNumber || "";

    const { code } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        error: "Coupon code required",
      });
    }

    const couponCode = String(code).trim().toUpperCase();

    const couponDoc = await mongoose.connection
      .collection("couponCodes")
      .findOne({ code: couponCode, active: true });

    if (!couponDoc) {
      return res.status(404).json({
        success: false,
        status: "invalid",
        error: "Coupon not found",
      });
    }

    const discount = Number(couponDoc.discount) || 0;
    const now = new Date();

    let existingStatus = await Couponstatus.findOne({
      userid: userId,
      code: couponCode,
    });

    if (couponCode !== "MANAPRINTKART") {
      if (existingStatus && existingStatus.status === true) {
        return res.status(200).json({
          success: true,
          status: "used",
          message: "Coupon already used by this user",
          data: {
            code: couponCode,
            discount,
            usedDate: existingStatus.usedDate,
          },
        });
      }
    }

    if (!existingStatus) {
      existingStatus = await Couponstatus.create({
        userid: userId,
        code: couponCode,
        status: true,
        discountPercentage: discount,
        usedDate: now,
        userName: name,
        userEmail: email,
        userMobile: mobile,
      });
    } else {
      existingStatus.status = true;
      existingStatus.discountPercentage = discount;
      existingStatus.usedDate = now;
      existingStatus.userName = name;
      existingStatus.userEmail = email;
      existingStatus.userMobile = mobile;

      await existingStatus.save();
    }

    await mongoose.connection
      .collection("couponCodes")
      .updateOne({ _id: couponDoc._id }, { $inc: { used: 1 } });

    if (email && resend) {
      try {
        await resend.emails.send({
          from: "MyBookHub <admin@mybookhub.store>",
          to: email,
          subject: "Coupon Applied Successfully 🎉",
          html: `
            <h2>Hello ${name || "User"},</h2>
            <p>Your coupon has been applied successfully.</p>
            <p><b>Coupon Code:</b> ${couponCode}</p>
            <p><b>Discount:</b> ₹${discount}</p>
            <p><b>Date:</b> ${now.toLocaleString()}</p>
            <p>Thank you for using <b>MyBookHub</b>.</p>
            <h4>For any queries, please contact us at <a href="mailto:support@mybookhub.store">support@mybookhub.store</a> .</h4>
          `,
        });
      } catch (err) {
        console.error("Coupon email error:", err);
      }
    }

    return res.status(200).json({
      success: true,
      status: "applied",
      message: "Coupon applied successfully",
      data: {
        code: couponCode,
        discount,
        usedDate: now,
      },
    });
  } catch (err) {
    console.error("Coupon verification error:", err);

    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
};

const applyCoupon = async (amount, couponCode, userId) => {
  try {
    if (!couponCode) {
      return { discount: 0, finalAmount: amount };
    }

    const normalizedCode = String(couponCode).trim().toUpperCase();

    const couponDoc = await mongoose.connection
      .collection("couponCodes")
      .findOne({
        code: normalizedCode,
        active: true,
      });

    if (!couponDoc) {
      return { discount: 0, finalAmount: amount };
    }

    if (normalizedCode !== "MANAPRINTKART") {
      const used = await Couponstatus.findOne({
        userid: userId,
        code: normalizedCode,
        status: true,
      });

      if (used) {
        return { discount: 0, finalAmount: amount };
      }
    }

    const discount = Number(couponDoc.discount) || 0;
    const finalAmount = Math.max(Number(amount || 0) - discount, 0);

    return {
      discount,
      finalAmount,
    };
  } catch (err) {
    console.error("Apply coupon error:", err);
    return {
      discount: 0,
      finalAmount: amount,
    };
  }
};

module.exports = {
  verifyCoupon,
  applyCoupon,
};