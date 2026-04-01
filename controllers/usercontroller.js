import dotenv from "dotenv";
dotenv.config();
import Prints from "../models/prints.js";
import Sellbooks from "../models/sellbooks.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const secretkey = process.env.SECRETKEY;

export const Register = async (req, res) => {
  const { fullname, mobileNumber, email, password } = req.body;

  if (!fullname || !mobileNumber || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const number = await User.findOne({ mobileNumber });
    const mail = await User.findOne({ email });

    if (number || mail) {
      return res.status(400).json({ error: "User already found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      fullname,
      mobileNumber,
      email,
      password: hashedPassword,
    });
    await newUser.save();

    try {
      await resend.emails.send({
        from: "MyBookHub <admin@mybookhub.store>",
        to: newUser.email,
        subject: `${newUser.fullname}! Welcome to MyBookHub `,
        html: `
          <h2>Hello ${newUser.fullname},</h2>
          <p>Welcome to <b>MyBookHub</b>! We're thrilled to have you on board.</p>
          <ul>
            <li>Buy or sell books easily.</li>
            <li>Order quick, affordable printouts anytime.</li>
          </ul>
          <p>Your journey for seamless study materials and secondhand books starts here.</p>
          <p>If you have any questions, reply to this email — we're always happy to help!</p>
          <p>Happy reading,<br/><b>The MyBookHub Team</b></p>
          <h4>For any queries, please contact us at <a href="mailto:support@mybookhub.store">support@mybookhub.store</a> .</h4>
        `,
      });

      console.log("Welcome email sent to:", newUser.email);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }
    res.status(201).json({
      message: "User registered successfully!",
      user: newUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    let user;

    if (emailRegex.test(identifier)) {
      user = await User.findOne({ email: identifier });
    } else if (phoneRegex.test(identifier)) {
      user = await User.findOne({ mobileNumber: identifier });
    } else {
      return res
        .status(400)
        .json({ success: false, error: "Invalid email or phone format" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, secretkey, {
      expiresIn: "3h",
    });

    res.cookie("token", token, {
      domain: ".mybookhub.store",
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        email: user.email,
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

export function setupUploadsStatic(app) {
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
}

export const getPrintsById = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    const user = await User.findById(userId).select(
      "fullname mobileNumber email",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const orders = await Prints.find({ userid: userId })
      .select(
        "name mobile file originalprice discountprice color sides binding copies address college year section rollno description paymentMethod paymentStatus transactionId razorpayOrderId razorpayPaymentId razorpaySignature orderDate status createdAt updatedAt",
      )
      .sort({ orderDate: -1 });

    return res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      orders: orders.map((order) => ({
        id: order._id,
        name: order.name || "",
        mobile: order.mobile || "",
        file: order.file || "",
        originalprice: order.originalprice ?? 0,
        discountprice: order.discountprice ?? 0,
        color: order.color || "",
        sides: order.sides || "",
        binding: order.binding || "",
        copies: order.copies ?? 0,
        college: order.college || "",
        year: order.year || "",
        section: order.section || "",
        address: order.address || "",
        rollno: order.rollno || "",
        description: order.description || "",

        paymentMethod: order.paymentMethod || "",
        paymentStatus: order.paymentStatus || "",
        transactionId: order.transactionId || "",
        razorpayOrderId: order.razorpayOrderId || "",
        razorpayPaymentId: order.razorpayPaymentId || "",
        razorpaySignature: order.razorpaySignature || "",

        orderDate: order.orderDate || null,
        status: order.status || "",
        createdAt: order.createdAt || null,
        updatedAt: order.updatedAt || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching user print orders:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getBooksById = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }
    const user = await User.findById(userId).select(
      "fullname mobileNumber email",
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const books = await Sellbooks.find({ user: userId })
      .select(
        "name image price condition description location categeory subcategeory selltype status updatedPrice soldstatus",
      )
      .sort({ date_added: -1 });
    return res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      books: books.map((book) => ({
        id: book._id,
        name: book.name,
        price: book.price,
        image: book.image,
        condition: book.condition,
        description: book.description,
        location: book.location,
        categeory: book.categeory,
        subcategeory: book.subcategeory,
        selltype: book.selltype,
        status: book.status,
        updatedPrice: book.updatedPrice,
        soldstatus: book.soldstatus,
        soldcount: book.soldcount,
      })),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    const user = await User.findById(userId).select(
      "fullname mobileNumber email birthday usertype college year branch rollno",
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = user.toObject();
    const isEmpty = (v) =>
      v === null || v === undefined || String(v).trim() === "";

    const needsFallback =
      isEmpty(userData.fullname) ||
      isEmpty(userData.mobileNumber) ||
      isEmpty(userData.college) ||
      isEmpty(userData.year) ||
      isEmpty(userData.rollno);

    if (needsFallback) {
      const firstOrder = await Prints.findOne({ userid: userId })
        .sort({ orderDate: 1 })
        .select("name mobile address college year rollno section orderDate");

      if (firstOrder) {
        userData.fullname = !isEmpty(userData.fullname)
          ? userData.fullname
          : firstOrder.name;
        userData.mobileNumber = !isEmpty(userData.mobileNumber)
          ? userData.mobileNumber
          : firstOrder.mobile;
        userData.college = !isEmpty(userData.college)
          ? userData.college
          : firstOrder.college;
        userData.year = !isEmpty(userData.year)
          ? userData.year
          : firstOrder.year;
        userData.rollno = !isEmpty(userData.rollno)
          ? userData.rollno
          : firstOrder.rollno;
        userData.branch = !isEmpty(userData.branch)
          ? userData.branch
          : firstOrder.section;
        userData.address = userData.address || firstOrder.address;
        userData.fallbackFromFirstOrder = true;
      }
    }

    return res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  const userId = req.userId;
  const updates = req.body;

  const allowedFields = [
    "fullname",
    "mobileNumber",
    "email",
    "birthday",
    "college",
    "year",
    "branch",
    "rollno",
  ];

  const validUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) validUpdates[key] = updates[key];
  }

  if (Object.keys(validUpdates).length === 0) {
    return res.status(400).json({ error: "No valid fields provided" });
  }

  try {
    const orConditions = [];
    if (validUpdates.fullname)
      orConditions.push({ fullname: validUpdates.fullname });
    if (validUpdates.mobileNumber)
      orConditions.push({ mobileNumber: validUpdates.mobileNumber });
    if (validUpdates.email) orConditions.push({ email: validUpdates.email });

    if (orConditions.length > 0) {
      const existing = await User.findOne({
        $or: orConditions,
        _id: { $ne: userId },
      });

      if (existing) {
        return res.status(400).json({ error: "Field already taken" });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: validUpdates },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Update failed" });
  }
};