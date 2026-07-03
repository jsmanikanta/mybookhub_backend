const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { Resend } = require("resend");
const mongoose = require("mongoose");
const User = require("../models/user");
const Sellbooks = require("../models/sellbooks");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      },
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const Sellbook = async (req, res) => {
  try {
    const userId = req.userId;

    console.log("[bookscontroller:Sellbook] Request received", {
      userId: userId ? String(userId) : "",
      hasImage: Boolean(req.file && req.file.buffer),
      fields: Object.keys(req.body || {}),
    });

    if (!userId) {
      console.warn("[bookscontroller:Sellbook] Missing userId");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.warn("[bookscontroller:Sellbook] Invalid userId", {
        userId: String(userId),
      });
      return res.status(401).json({
        success: false,
        message: "Invalid user",
      });
    }

    const user = await User.findById(userId).select(
      "fullname email mobileNumber",
    );

    if (!user) {
      console.warn("[bookscontroller:Sellbook] User not found", {
        userId: String(userId),
      });
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      name,
      price,
      updatedPrice,
      categeory,
      subcategeory,
      description,
      state,
      district,
      pincode,
      address,
      landmark,
      selltype,
      condition,
    } = req.body;

    const trimmedName = normalizeText(name);
    const trimmedCategory = normalizeText(categeory);
    const trimmedSubcategory = normalizeText(subcategeory);
    const trimmedCondition = normalizeText(condition);
    const trimmedState = normalizeText(state);
    const trimmedDistrict = normalizeText(district);
    const trimmedPincode = String(pincode || "").trim();
    const trimmedAddress = normalizeText(address);
    const trimmedLandmark = normalizeText(landmark);
    const trimmedSelltype = normalizeText(selltype);
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";

    if (
      !trimmedName ||
      price === undefined ||
      price === null ||
      !trimmedCategory ||
      !trimmedCondition ||
      !trimmedState ||
      !trimmedDistrict ||
      !trimmedPincode ||
      !trimmedAddress ||
      !trimmedSelltype
    ) {
      console.warn("[bookscontroller:Sellbook] Missing required fields", {
        userId: String(userId),
        name: trimmedName,
        category: trimmedCategory,
        condition: trimmedCondition,
        state: trimmedState,
        district: trimmedDistrict,
        pincode: trimmedPincode,
        selltype: trimmedSelltype,
      });
      return res.status(400).json({
        success: false,
        message:
          "name, price, categeory, condition, state, district, pincode, address, selltype are required",
      });
    }

    const parsedPrice = Number(price);
    const parsedUpdatedPrice =
      updatedPrice !== undefined && updatedPrice !== null && updatedPrice !== ""
        ? Number(updatedPrice)
        : parsedPrice;

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      console.warn("[bookscontroller:Sellbook] Invalid price", {
        userId: String(userId),
        price,
      });
      return res.status(400).json({
        success: false,
        message: "price must be a valid number",
      });
    }

    if (Number.isNaN(parsedUpdatedPrice) || parsedUpdatedPrice < 0) {
      console.warn("[bookscontroller:Sellbook] Invalid updatedPrice", {
        userId: String(userId),
        updatedPrice,
      });
      return res.status(400).json({
        success: false,
        message: "updatedPrice must be a valid number",
      });
    }

    if (!req.file || !req.file.buffer) {
      console.warn("[bookscontroller:Sellbook] Missing book image", {
        userId: String(userId),
      });
      return res.status(400).json({
        success: false,
        message: "Book image is required",
      });
    }

    console.log("[bookscontroller:Sellbook] Uploading image to Cloudinary", {
      userId: String(userId),
      name: trimmedName,
    });
    const uploadResult = await uploadToCloudinary(req.file.buffer, "sellbooks");

    console.log("[bookscontroller:Sellbook] Image uploaded", {
      userId: String(userId),
      imageUrl: uploadResult.secure_url,
    });

    const newBook = await Sellbooks.create({
      name: trimmedName,
      image: uploadResult.secure_url,
      price: parsedPrice,
      updatedPrice: parsedUpdatedPrice,
      condition: trimmedCondition,
      description: trimmedDescription,
      state: trimmedState,
      district: trimmedDistrict,
      pincode: trimmedPincode,
      address: trimmedAddress,
      landmark: trimmedLandmark,
      categeory: trimmedCategory,
      subcategeory: trimmedSubcategory,
      selltype: trimmedSelltype,
      user: userId,
    });

    console.log("[bookscontroller:Sellbook] Book created", {
      userId: String(userId),
      bookId: String(newBook._id),
      email: user.email,
    });

    const adminEmailHtml = `
      <h2>📘 New Book Listed</h2>

      <h3>User Details</h3>
      <ul>
        <li>Name: ${user.fullname || "-"}</li>
        <li>Email: ${user.email || "-"}</li>
        <li>Mobile: ${user.mobileNumber || "-"}</li>
      </ul>

      <h3>Book Details</h3>
      <ul>
        <li>Name: ${newBook.name}</li>
        <li>Category: ${newBook.categeory}</li>
        <li>Subcategory: ${newBook.subcategeory || "-"}</li>
        <li>Condition: ${newBook.condition}</li>
        <li>Price: ₹${newBook.price}</li>
        <li>Updated Price: ₹${newBook.updatedPrice}</li>
        <li>District: ${newBook.district}</li>
        <li>Pincode: ${newBook.pincode}</li>
        <li>Status: ${newBook.status || "-"}</li>
      </ul>
      <p><a href="${newBook.image}" target="_blank">View Image</a></p>
    `;

    const sellerEmailHtml = `
      <h2> Your Book Has Been Listed Successfully!</h2>

      <p>Hello ${user.fullname || "User"},</p>

      <p>Your book has been successfully submitted on <strong>MyBookHub</strong>. Our team will review it shortly.</p>

      <h3>Book Details</h3>
      <ul>
        <li><strong>Name:</strong> ${newBook.name}</li>
        <li><strong>Category:</strong> ${newBook.categeory}</li>
        <li><strong>Subcategory:</strong> ${newBook.subcategeory || "-"}</li>
        <li><strong>Condition:</strong> ${newBook.condition}</li>
        <li><strong>Price:</strong> ₹${newBook.price}</li>
        <li><strong>Updated Price:</strong> ₹${newBook.updatedPrice}</li>
        <li><strong>District:</strong> ${newBook.district}</li>
        <li><strong>Pincode:</strong> ${newBook.pincode}</li>
        <li><strong>Status:</strong> ${newBook.status || "Pending Approval"}</li>
      </ul>

      <p>You will be notified once the book is approved and visible to buyers.</p>

      <p>
        <a href="${newBook.image}" target="_blank">View Uploaded Image</a>
      </p>

      <br/>

      <p>Thank you for using <strong>MyBookHub</strong> to buy and sell books 📖</p>

      <p>Best Regards,<br/>MyBookHub Team</p>
     <h4>For any queries, please contact us at <a href="mailto:support@mybookhub.store">support@mybookhub.store</a> .</h4>
    `;

    try {
      await resend.emails.send({
        from: "MyBookHub <admin@mybookhub.store>",
        to: "printkart0001@gmail.com",
        subject: "📘 New Book Listed for Sale - MyBookHub",
        html: adminEmailHtml,
      });
      console.log("[bookscontroller:Sellbook] Admin notification sent", {
        bookId: String(newBook._id),
      });
    } catch (mailError) {
      console.error("Admin email send error:", mailError);
    }

    try {
      if (user.email) {
        await resend.emails.send({
          from: "MyBookHub <admin@mybookhub.store>",
          to: user.email,
          subject: "📚 Your Book Listing Received - MyBookHub",
          html: sellerEmailHtml,
        });
        console.log("[bookscontroller:Sellbook] Seller notification sent", {
          bookId: String(newBook._id),
          email: user.email,
        });
      }
    } catch (mailError) {
      console.error("Seller email send error:", mailError);
    }

    console.log("[bookscontroller:Sellbook] Request completed", {
      userId: String(userId),
      bookId: String(newBook._id),
    });

    return res.status(201).json({
      success: true,
      message: "Book listed successfully",
      book: newBook,
    });
  } catch (error) {
    console.error("Sellbook error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateSoldStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { soldstatus } = req.body;

    console.log("[bookscontroller:updateSoldStatus] Request received", {
      userId: userId ? String(userId) : "",
      bookId: id || "",
      soldstatus: soldstatus || "",
    });

    if (!userId) {
      console.warn("[bookscontroller:updateSoldStatus] Missing userId");
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn("[bookscontroller:updateSoldStatus] Invalid book ID", {
        bookId: id,
      });
      return res.status(400).json({
        success: false,
        error: "Invalid book ID",
      });
    }

    const allowedStatuses = ["Instock", "Soldout"];
    if (!allowedStatuses.includes(soldstatus)) {
      console.warn("[bookscontroller:updateSoldStatus] Invalid soldstatus", {
        soldstatus,
      });
      return res.status(400).json({
        success: false,
        error: "soldstatus must be 'Instock' or 'Soldout'",
      });
    }

    const updatedBook = await Sellbooks.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { soldstatus } },
      {
        new: true,
        runValidators: false,
      },
    );

    if (!updatedBook) {
      console.warn(
        "[bookscontroller:updateSoldStatus] Book not found or unauthorized",
        {
          userId: String(userId),
          bookId: id,
        },
      );
      return res.status(404).json({
        success: false,
        error: "Book not found or not authorized",
      });
    }

    console.log("[bookscontroller:updateSoldStatus] Sold status updated", {
      userId: String(userId),
      bookId: id,
      soldstatus: updatedBook.soldstatus,
    });

    return res.status(200).json({
      success: true,
      message: "Sold status updated successfully",
      soldstatus: updatedBook.soldstatus,
      book: updatedBook,
    });
  } catch (error) {
    console.error("updateSoldStatus error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
};

module.exports = {
  Sellbook,
  updateSoldStatus,
};
