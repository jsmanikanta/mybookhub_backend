const { Resend } = require("resend");
const dotenv = require("dotenv");
const User = require("../models/user");
const Prints = require("../models/prints");
const cloudinary = require("cloudinary");
const streamifier = require("streamifier");

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: folderName, resource_type: "auto" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const orderPrint = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const email = req.user?.email;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      mobile,
      color,
      sides,
      address,
      originalprice,
      discountprice,
      rollno,
      college,
      year,
      section,
      description,
      binding,
      copies,
      paymentMethod,
    } = req.body;

    if (!name || !mobile) {
      return res.status(400).json({
        message: "Name and mobile number are required",
      });
    }

    if (!color || !sides || !originalprice || !paymentMethod) {
      return res.status(400).json({
        message: "Required fields missing",
      });
    }

    if (!["Razorpay", "Pay on Delivery"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    if (!req.files?.file?.[0]) {
      return res.status(400).json({
        message: "Print PDF file is required",
      });
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    const pdfFile = req.files.file[0];

    if (pdfFile.size > MAX_SIZE) {
      return res.status(400).json({
        message: "PDF file size must be less than 10MB",
      });
    }

    const uploadedPrint = await uploadToCloudinary(
      pdfFile.buffer,
      "PrintOrders",
    );

    if (!uploadedPrint?.secure_url) {
      return res.status(500).json({
        message: "Failed to upload print file",
      });
    }

    const newOrder = new Prints({
      name,
      mobile,
      file: uploadedPrint.secure_url,
      originalprice: Number(originalprice),
      discountprice:
        discountprice !== undefined &&
        discountprice !== null &&
        discountprice !== ""
          ? Number(discountprice)
          : undefined,
      color,
      sides,
      binding: binding || "none",
      copies: copies ? Number(copies) : 1,
      address: address || "",
      college: college || user.college || "",
      year: year || user.year || "",
      section: section || "",
      rollno: rollno || user.rollno || "",
      description: description || "",
      userid: userId,
      paymentMethod,
      paymentStatus: "pending",
      status: "Order placed",
    });

    await newOrder.save();

    const adminEmailHtml = `
      <h2>New print order placed by ${newOrder.name}</h2>

      <h3>Order Details:</h3>
      <ul>
        <li><b>Name:</b> ${newOrder.name}</li>
        <li><b>Mobile:</b> ${newOrder.mobile}</li>
        <li><b>Color:</b> ${newOrder.color}</li>
        <li><b>Sides:</b> ${newOrder.sides}</li>
        <li><b>Binding:</b> ${newOrder.binding}</li>
        <li><b>Copies:</b> ${newOrder.copies}</li>
        <li><b>Original Price:</b> ${newOrder.originalprice}</li>
        <li><b>Discount Price:</b> ${newOrder.discountprice ?? "N/A"}</li>
        <li><b>Address:</b> ${newOrder.address || "N/A"}</li>
        <li><b>College Info:</b> ${newOrder.college || "N/A"}, ${newOrder.year || "N/A"}, ${newOrder.section || "N/A"}, ${newOrder.rollno || "N/A"}</li>
        <li><b>Description:</b> ${newOrder.description || "N/A"}</li>
        <li><b>Payment Method:</b> ${newOrder.paymentMethod}</li>
        <li><b>Payment Status:</b> ${newOrder.paymentStatus}</li>
        <li><b>Order Status:</b> ${newOrder.status}</li>
      </ul>

      <p><b>Order Date:</b> ${newOrder.orderDate.toLocaleString()}</p>
      <p><a href="${uploadedPrint.secure_url}" target="_blank">View Print File</a></p>
    `;

    await resend.emails.send({
      from: "Admin <admin@mybookhub.store>",
      to: "printkart0001@gmail.com",
      subject: "New Print Order Placed - MyBookHub",
      html: adminEmailHtml,
    });

    try {
      await resend.emails.send({
        from: "MyBookHub <admin@mybookhub.store>",
        to: email,
        subject: "Thank You for Your Print Order",
        html: `
          <h2>Hello ${name},</h2>

          <p>Thank you for placing your print order with <b>MyBookHub</b>.</p>

          <ul>
            <li><b>Order Status:</b> ${newOrder.status}</li>
            <li><b>Payment Method:</b> ${newOrder.paymentMethod}</li>
            <li><b>Copies:</b> ${newOrder.copies}</li>
            <li><b>Binding:</b> ${newOrder.binding}</li>
            <li><b>Color:</b> ${newOrder.color}</li>
            <li><b>Sides:</b> ${newOrder.sides}</li>
          </ul>

          ${
            newOrder.paymentMethod === "Pay on Delivery"
              ? `<p>You can pay at delivery.</p>`
              : `<p>Please complete your payment via Razorpay.</p>`
          }

          <p>Best regards,<br/><b>The MyBookHub Team</b></p>
          <h4>Support: <a href="mailto:support@mybookhub.store">support@mybookhub.store</a></h4>
        `,
      });
    } catch (emailError) {
      console.error("Email error:", emailError);
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: newOrder,
    });
  } catch (error) {
    console.error("Error placing order:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const userId = req.userId || req.user?._id;
    const name = req.user?.fullname;
    const email = req.user?.email;
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    const order = await Prints.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.userid.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    if (order.status !== "Order placed") {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled now",
      });
    }

    order.status = "Cancelled";
    await order.save();

    if (email && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: "MyBookHub <admin@mybookhub.store>",
          to: email,
          subject: "Your Print Order Has Been Cancelled",
          html: `
            <h2>Hello ${name || "User"},</h2>

            <p>Your print order has been <b>successfully cancelled</b>.</p>

            <p><b>Order ID:</b> ${order._id}</p>
            <p><b>Status:</b> Cancelled</p>
            <p><b>Payment Method:</b> ${order.paymentMethod}</p>
            <p><b>Date:</b> ${new Date().toLocaleString()}</p>

            ${
              order.paymentStatus === "paid"
                ? `<p>Your refund will be <b>processed manually by the admin team</b>.</p>`
                : `<p>No payment was completed for this order.</p>`
            }

            <p>If this cancellation was done by mistake, you can place a new order anytime.</p>

            <p>Thank you for using <b> PrintKart</b>.</p>

            <br/>
            <p>Regards,<br/>MyBookHub Team</p>
            <h4>For any queries, please contact us at <a href="mailto:support@mybookhub.store">support@mybookhub.store</a>.</h4>
          `,
        });

        console.log("User cancellation email sent");
      } catch (mailError) {
        console.error("User email send error:", mailError);
      }
    }

    try {
      await resend.emails.send({
        from: "Admin <admin@mybookhub.store>",
        to: "printkart0001@gmail.com",
        subject: "Print Order Cancelled by User",
        html: `
          <h2>Order Cancelled</h2>

          <p>A user has cancelled a print order.</p>

          <ul>
            <li><b>User:</b> ${order.name}</li>
            <li><b>Email:</b> ${email}</li>
            <li><b>Order ID:</b> ${order._id}</li>
            <li><b>Order Status:</b> Cancelled</li>
            <li><b>Payment Method:</b> ${order.paymentMethod}</li>
            <li><b>Payment Status:</b> ${order.paymentStatus}</li>
          </ul>

          ${
            order.paymentStatus === "paid"
              ? `<p><b>Action Required:</b> Process refund manually for this order.</p>`
              : `<p>No refund required.</p>`
          }

          <p>Cancelled on: ${new Date().toLocaleString()}</p>
          <h4>For any queries, please contact us at <a href="mailto:support@mybookhub.store">support@mybookhub.store</a>.</h4>
        `,
      });

      console.log("Admin cancellation email sent");
    } catch (mailError) {
      console.error("Admin email send error:", mailError);
    }

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  orderPrint,
  cancelOrder,
};
