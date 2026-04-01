const Razorpay = require("razorpay");
const Payment = require("../models/payments");
const PrintsImport = require("../models/prints");
const crypto = require("crypto");
const User =require("../models/user.js");
const Prints = PrintsImport.default || PrintsImport;

function getEnvValue(primary, fallback) {
  return process.env[primary] || process.env[fallback] || "";
}

const RAZORPAY_KEY_ID = getEnvValue("RAZORPAY_KEY_ID", "RAZORPAY_KEY");
const RAZORPAY_KEY_SECRET = getEnvValue(
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_SECRET",
);
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_PAYEMENTS);

function hasRazorpayKeys() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function getRazorpayInstance() {
  if (!hasRazorpayKeys()) {
    throw new Error(
      "Razorpay keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.",
    );
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildReceipt(printOrderId) {
  return `p_${String(printOrderId).slice(-10)}`;
}

const createOrder = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { printOrderId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!printOrderId) {
      return res.status(400).json({
        success: false,
        message: "printOrderId is required",
      });
    }

    if (!hasRazorpayKeys()) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured on the server",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (printOrder.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment already completed for this order",
      });
    }

    const originalAmount = toNumber(printOrder.originalprice, 0);
    const discountedAmount =
      printOrder.discountprice !== undefined &&
      printOrder.discountprice !== null &&
      printOrder.discountprice !== ""
        ? toNumber(printOrder.discountprice, originalAmount)
        : originalAmount;

    const finalAmount =
      discountedAmount > 0 ? discountedAmount : originalAmount;

    if (!finalAmount || Number.isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount",
      });
    }

    const amountInPaise = Math.round(finalAmount * 100);

    const existingPendingPayment = await Payment.findOne({
      printOrderId: printOrder._id,
      status: { $in: ["created", "pending"] },
    }).sort({ createdAt: -1 });

    if (existingPendingPayment?.razorpayOrderId) {
      if (!printOrder.razorpayOrderId) {
        printOrder.razorpayOrderId = existingPendingPayment.razorpayOrderId;
        printOrder.paymentMethod = "Razorpay";
        printOrder.paymentStatus = "pending";
        await printOrder.save();
      }

      return res.status(200).json({
        success: true,
        message: "Existing Razorpay order found",
        key: RAZORPAY_KEY_ID,
        razorpayOrderId: existingPendingPayment.razorpayOrderId,
        amount: amountInPaise,
        currency: "INR",
        printOrderId: printOrder._id,
        paymentId: existingPendingPayment._id,
      });
    }

    const razorpay = getRazorpayInstance();

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: buildReceipt(printOrder._id),
      notes: {
        printOrderId: String(printOrder._id),
        userId: String(userId),
      },
    });
    const payment = await Payment.create({
      userId,
      printOrderId: printOrder._id,
      razorpayOrderId: razorpayOrder.id,
      amount: originalAmount,
      discount: Math.max(originalAmount - finalAmount, 0),
      finalAmount,
      currency: "INR",
      status: "created",
    });

    printOrder.razorpayOrderId = razorpayOrder.id;
    printOrder.paymentMethod = "Razorpay";
    printOrder.paymentStatus = "pending";
    await printOrder.save();

    return res.status(200).json({
      success: true,
      message: "Razorpay order created",
      key: RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      printOrderId: printOrder._id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("createOrder error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error?.description || error?.message || "Unknown server error",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const {
      printOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !printOrderId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
      });
    }

    if (!RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Razorpay secret is not configured on the server",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (printOrder.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        order: printOrder,
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "failed",
        },
      );

      printOrder.paymentStatus = "failed";
      printOrder.razorpayPaymentId = razorpay_payment_id;
      printOrder.razorpaySignature = razorpay_signature;
      printOrder.transactionId = razorpay_payment_id;
      await printOrder.save();

      const paymentDetailsHtml = `
  <h2>💰 Payment Successful</h2>

  <h3>Payment Details:</h3>
  <ul>
    <li><b>Payment Method:</b> Razorpay</li>
    <li><b>Payment Status:</b> <span style="color: green;"><b>PAID</b></span></li>
    <li><b>Transaction ID:</b> ${printOrder.transactionId}</li>
    <li><b>Razorpay Order ID:</b> ${printOrder.razorpayOrderId}</li>
    <li><b>Razorpay Payment ID:</b> ${printOrder.razorpayPaymentId}</li>
    <li><b>Amount:</b> ${printOrder.originalprice}</li>
    <li><b>Discount:</b> ${Math.max(printOrder.originalprice - (printOrder.discountprice || printOrder.originalprice), 0)}</li>
    <li><b>Final Paid Amount:</b> ${printOrder.discountprice || printOrder.originalprice}</li>
    <li><b>Currency:</b> INR</li>
    <h4>For any queries, please contact us at support@mybookhub.store.</h4>
  </ul>
`;
      await resend.emails.send({
        from: "PrintKart <admin@mybookhub.store>",
        to: user.email, // or admin mail
        subject: "Payment Successful - PrintKart",
        html: paymentDetailsHtml,
      });

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    let payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      payment = await Payment.create({
        userId,
        printOrderId: printOrder._id,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        amount: toNumber(printOrder.originalprice, 0),
        discount: Math.max(
          toNumber(printOrder.originalprice, 0) -
            toNumber(
              printOrder.discountprice !== undefined &&
                printOrder.discountprice !== null &&
                printOrder.discountprice !== ""
                ? printOrder.discountprice
                : printOrder.originalprice,
              0,
            ),
          0,
        ),
        finalAmount: toNumber(
          printOrder.discountprice !== undefined &&
            printOrder.discountprice !== null &&
            printOrder.discountprice !== ""
            ? printOrder.discountprice
            : printOrder.originalprice,
          0,
        ),
        currency: "INR",
        status: "paid",
      });
    } else {
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      payment.status = "paid";
      await payment.save();
    }

    printOrder.paymentStatus = "paid";
    printOrder.paymentMethod = "Razorpay";
    printOrder.razorpayOrderId = razorpay_order_id;
    printOrder.razorpayPaymentId = razorpay_payment_id;
    printOrder.razorpaySignature = razorpay_signature;
    printOrder.transactionId = razorpay_payment_id;
    await printOrder.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      order: printOrder,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during payment verification",
      error: error?.message || "Unknown server error",
    });
  }
};

const paymentFailed = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const { printOrderId, razorpayOrderId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!printOrderId || !razorpayOrderId) {
      return res.status(400).json({
        success: false,
        message: "Missing order details",
      });
    }

    const printOrder = await Prints.findById(printOrderId);

    if (!printOrder) {
      return res.status(404).json({
        success: false,
        message: "Print order not found",
      });
    }

    if (!printOrder.userid || String(printOrder.userid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { status: "failed" },
      { new: true },
    );

    printOrder.paymentStatus = "failed";
    printOrder.razorpayOrderId = razorpayOrderId;
    await printOrder.save();

    const paymentFailedHtml = `
  <h2>❌ Payment Failed</h2>

  <h3>Payment Details:</h3>
  <ul>
    <li><b>Payment Method:</b> Razorpay</li>
    <li><b>Payment Status:</b> <span style="color: red;"><b>FAILED</b></span></li>
    <li><b>Transaction ID:</b> ${printOrder.transactionId || "N/A"}</li>
    <li><b>Razorpay Order ID:</b> ${printOrder.razorpayOrderId || "N/A"}</li>
    <li><b>Razorpay Payment ID:</b> ${printOrder.razorpayPaymentId || "N/A"}</li>
    <li><b>Amount:</b> ${printOrder.originalprice}</li>
    <li><b>Discount:</b> ${Math.max(printOrder.originalprice - (printOrder.discountprice || printOrder.originalprice), 0)}</li>
    <li><b>Final Amount:</b> ${printOrder.discountprice || printOrder.originalprice}</li>
    <li><b>Currency:</b> INR</li>
  </ul>
  <h4>For any queries, please contact us at support@mybookhub.store.</h4>

  <p>Please try the payment again.</p>
`;
    await resend.emails.send({
      from: "PrintKart <admin@mybookhub.store>",
      to: [user.email, "printkart0001@gmail.com"],
      subject: "Payment Failed - PrintKart",
      html: paymentFailedHtml,
    });

    return res.status(200).json({
      success: true,
      message: "Payment marked as failed",
    });
  } catch (error) {
    console.error("paymentFailed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error?.message || "Unknown server error",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  paymentFailed,
};
