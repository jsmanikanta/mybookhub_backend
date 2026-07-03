const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cloudinary = require("cloudinary");
const streamifier = require("streamifier");
const PrintsImport = require("../models/prints");
const SellbooksImport = require("../models/sellbooks");
const BookCategoryImageImport = require("../models/categeory");

const Prints = PrintsImport.default || PrintsImport;
const Sellbooks = SellbooksImport.default || SellbooksImport;
const BookCategoryImage =
  BookCategoryImageImport.default || BookCategoryImageImport;

dotenv.config();

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const getAllOrders = async (req, res) => {
  try {
    console.log("[admin:getAllOrders] Request received");
    const orders = await Prints.find()
      .sort({ orderDate: -1 })
      .populate("userid", "fullname email mobileNumber");

    console.log("[admin:getAllOrders] Orders fetched", {
      totalOrders: orders.length,
    });

    return res.status(200).json({
      success: true,
      orders: orders.map((order) => ({
        _id: order._id,
        fullName: order.name || "-",
        mobile: order.mobile || "-",
        file: order.file || "-",
        color: order.color || "-",
        sides: order.sides || "-",
        originalprice:
          order.originalprice !== undefined ? order.originalprice : "-",
        discountprice:
          order.discountprice !== undefined &&
          order.discountprice !== null &&
          order.discountprice !== ""
            ? order.discountprice
            : order.originalprice,
        binding: order.binding || "none",
        copies: order.copies !== undefined ? order.copies : 1,
        rollno: order.rollno || "-",
        college: order.college || "-",
        year: order.year || "-",
        section: order.section || "-",
        address: order.address || "-",
        description: order.description || "-",
        paymentMethod: order.paymentMethod || "-",
        paymentStatus: order.paymentStatus || "pending",
        razorpayOrderId: order.razorpayOrderId || "",
        razorpayPaymentId: order.razorpayPaymentId || "",
        razorpaySignature: order.razorpaySignature || "",
        transactionId: order.transactionId || "",
        orderDate: order.orderDate || null,
        status: order.status || "Order placed",
        userid: order.userid || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message,
    });
  }
};

const updatePaymentStatus = async (req, res) => {
  const { orderId } = req.params;

  let { paymentStatus } = req.body;

  console.log("[admin:updatePaymentStatus] Request received", {
    orderId: orderId || "",
    paymentStatus: paymentStatus || "",
  });

  if (!paymentStatus) {
    console.warn("[admin:updatePaymentStatus] Missing paymentStatus", {
      orderId: orderId || "",
    });
    return res.status(400).json({ error: "paymentStatus is required" });
  }

  paymentStatus = paymentStatus.toString().trim().toLowerCase();

  const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];

  if (!validPaymentStatuses.includes(paymentStatus)) {
    console.warn("[admin:updatePaymentStatus] Invalid paymentStatus", {
      orderId: orderId || "",
      paymentStatus,
    });
    return res.status(400).json({ error: "Invalid payment status value" });
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    console.warn("[admin:updatePaymentStatus] Invalid orderId format", {
      orderId,
    });
    return res.status(400).json({ error: "Invalid orderId format" });
  }

  try {
    const order = await Prints.findById(orderId);

    if (!order) {
      console.warn("[admin:updatePaymentStatus] Order not found", {
        orderId,
      });
      return res.status(404).json({ error: "Order not found" });
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === "paid" && !order.paymentMethod) {
      order.paymentMethod = "Razorpay";
    }

    await order.save();

    console.log("[admin:updatePaymentStatus] Payment status updated", {
      orderId,
      paymentStatus,
    });

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const updatePrintStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, discountprice } = req.body;

  console.log("[admin:updatePrintStatus] Request received", {
    orderId: orderId || "",
    status: status || "",
    discountprice: discountprice ?? "",
  });

  const validStatuses = [
    "Order placed",
    "Verified",
    "Ready to dispatch",
    "Out for delivery",
    "Delivered",
    "Cancelled",
  ];

  if (!validStatuses.includes(status)) {
    console.warn("[admin:updatePrintStatus] Invalid status", {
      orderId: orderId || "",
      status,
    });
    return res.status(400).json({ error: "Invalid status value" });
  }

  if (!mongoose.Types.ObjectId.isValid(orderId)) {
    console.warn("[admin:updatePrintStatus] Invalid orderId format", {
      orderId,
    });
    return res.status(400).json({ error: "Invalid orderId format" });
  }

  try {
    const order = await Prints.findById(orderId);

    if (!order) {
      console.warn("[admin:updatePrintStatus] Order not found", {
        orderId,
      });
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;

    if (
      discountprice !== undefined &&
      discountprice !== null &&
      discountprice !== "" &&
      !isNaN(discountprice)
    ) {
      order.discountprice = Number(discountprice);
    }

    await order.save();

    console.log("[admin:updatePrintStatus] Print status updated", {
      orderId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Print order updated successfully",
      order,
    });
  } catch (error) {
    console.error("Error updating print order status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllBooks = async (req, res) => {
  try {
    console.log("[admin:getAllBooks] Request received");
    const books = await Sellbooks.find()
      .populate({
        path: "user",
        select: "fullname email mobileNumber",
      })
      .sort({ date_added: -1 })
      .lean();

    const formattedBooks = books.map((book) => ({
      _id: book._id,
      name: book.name || "-",
      image: book.image || "-",
      status: book.status || "Pending",
      price: book.price ?? "-",
      updatedPrice: book.updatedPrice ?? "-",
      condition: book.condition || "-",
      description: book.description || "-",
      state: book.state || "-",
      district: book.district || "-",
      pincode: book.pincode || "-",
      address: book.address || "-",
      landmark: book.landmark || "-",
      category: book.categeory || "-",
      subcategory: book.subcategeory || "-",
      selltype: book.selltype || "-",
      soldstatus: book.soldstatus || "Instock",
      soldcount: book.soldcount ?? 0,
      userFullName: book.user?.fullname || "-",
      userEmail: book.user?.email || "-",
      userMobile: book.user?.mobileNumber || "-",
      userId: book.user?._id || "-",
      date_added: book.date_added || null,
    }));

    console.log("[admin:getAllBooks] Books fetched", {
      totalBooks: formattedBooks.length,
    });

    return res.status(200).json({
      success: true,
      count: formattedBooks.length,
      books: formattedBooks,
    });
  } catch (error) {
    console.error("Admin books error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status, sellingPrice, stockStatus } = req.body;

    console.log("[admin:updateStatus] Request received", {
      bookId: bookId || "",
      status: status || "",
      sellingPrice: sellingPrice ?? "",
      stockStatus: stockStatus || "",
    });

    if (!["Accepted", "Rejected"].includes(status)) {
      console.warn("[admin:updateStatus] Invalid status", {
        bookId: bookId || "",
        status,
      });
      return res.status(400).json({ error: "Invalid status" });
    }

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      console.warn("[admin:updateStatus] Invalid bookId format", {
        bookId,
      });
      return res.status(400).json({ error: "Invalid bookId format" });
    }

    const book = await Sellbooks.findById(bookId);

    if (!book) {
      console.warn("[admin:updateStatus] Book not found", {
        bookId,
      });
      return res.status(404).json({ error: "Book not found" });
    }

    book.status = status;

    if (
      sellingPrice !== undefined &&
      sellingPrice !== null &&
      sellingPrice !== "" &&
      !isNaN(sellingPrice)
    ) {
      book.updatedPrice = Number(sellingPrice);
    }

    if (
      stockStatus !== undefined &&
      ["Instock", "Soldout", "Orderd"].includes(stockStatus)
    ) {
      book.soldstatus = stockStatus;
    }

    await book.save();

    const updatedBook = await Sellbooks.findById(bookId).populate(
      "user",
      "fullname email mobileNumber",
    );

    console.log("[admin:updateStatus] Book status updated", {
      bookId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: `Book ${status.toLowerCase()} successfully`,
      book: {
        _id: updatedBook._id,
        name: updatedBook.name,
        image: updatedBook.image,
        status: updatedBook.status,
        price: updatedBook.price,
        updatedPrice: updatedBook.updatedPrice,
        condition: updatedBook.condition,
        categeory: updatedBook.categeory,
        subcategeory: updatedBook.subcategeory,
        selltype: updatedBook.selltype,
        soldstatus: updatedBook.soldstatus,
        userFullName: updatedBook.user?.fullname || "-",
        userEmail: updatedBook.user?.email || "-",
        userMobile: updatedBook.user?.mobileNumber || "-",
        userId: updatedBook.user?._id || "-",
      },
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const uploadToCloudinary = async (buffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const uploadBookCategoryImage = async (req, res) => {
  try {
    const { categeory, subcategeory } = req.body;

    console.log("[admin:uploadBookCategoryImage] Request received", {
      categeory: categeory || "",
      subcategeory: subcategeory || "",
      hasFile: Boolean(req.file),
    });

    if (!req.file) {
      console.warn("[admin:uploadBookCategoryImage] Image file missing");
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    if (!categeory && !subcategeory) {
      return res.status(400).json({
        success: false,
        message: "Either categeory or subcategeory is required",
      });
    }

    if (categeory && subcategeory) {
      return res.status(400).json({
        success: false,
        message: "Send only one: categeory or subcategeory",
      });
    }

    const folderType = categeory ? "category" : "subcategory";
    const folderName = `mybookhub/book-home-images/${folderType}`;

    const uploadedImage = await uploadToCloudinary(req.file.buffer, folderName);

    if (!uploadedImage?.secure_url) {
      console.warn("[admin:uploadBookCategoryImage] Cloudinary upload failed");
      return res.status(500).json({
        success: false,
        message: "Cloudinary upload failed",
      });
    }

    const newImageDoc = await BookCategoryImage.create({
      categeory: categeory || "",
      subcategeory: subcategeory || "",
      image: uploadedImage.secure_url,
      folderType,
    });

    console.log("[admin:uploadBookCategoryImage] Image uploaded", {
      imageId: String(newImageDoc._id),
      folderType,
    });

    return res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: newImageDoc,
    });
  } catch (error) {
    console.error("uploadBookCategoryImage error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const getBookCategoryImages = async (req, res) => {
  try {
    const { categeory, subcategeory } = req.query;

    console.log("[admin:getBookCategoryImages] Request received", {
      categeory: categeory || "",
      subcategeory: subcategeory || "",
    });

    const filter = {};
    if (categeory) filter.categeory = categeory;
    if (subcategeory) filter.subcategeory = subcategeory;

    const images = await BookCategoryImage.find(filter).sort({ createdAt: -1 });

    console.log("[admin:getBookCategoryImages] Images fetched", {
      totalImages: images.length,
    });

    return res.status(200).json({
      success: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    console.error("getBookCategoryImages error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const deleteBookCategoryImage = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("[admin:deleteBookCategoryImage] Request received", {
      id: id || "",
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn("[admin:deleteBookCategoryImage] Invalid image id", {
        id,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid image id",
      });
    }

    const deleted = await BookCategoryImage.findByIdAndDelete(id);

    if (!deleted) {
      console.warn("[admin:deleteBookCategoryImage] Image record not found", {
        id,
      });
      return res.status(404).json({
        success: false,
        message: "Image record not found",
      });
    }

    console.log("[admin:deleteBookCategoryImage] Image record deleted", {
      id,
    });

    return res.status(200).json({
      success: true,
      message: "Image record deleted successfully",
    });
  } catch (error) {
    console.error("deleteBookCategoryImage error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllOrders,
  updatePrintStatus,
  updatePaymentStatus,
  getAllBooks,
  updateStatus,
  uploadBookCategoryImage,
  getBookCategoryImages,
  deleteBookCategoryImage,
};
