import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import userroute from "./routes/userroute.js";
import orders from "./routes/ordersroute.js";
import admin from "./routes/adminroute.js";
import books from "./routes/bookroute.js";
import papers from "./routes/papersroute.js";
import coupon from "./routes/couponroute.js";
import location from "./routes/locationroute.js";
import payment from "./routes/paymentroute.js";
import wish from "./routes/wishroute.js";
import { getImages } from "./getimages.js";

dotenv.config();

const app = express();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS
app.use(cors());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to database
mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

// Routes
app.use("/user", userroute);
app.use("/orders", orders);
app.use("/books", books);
app.use("/admin", admin);
app.use("/anits", papers);
app.use("/coupon", coupon);
app.use("/locations", location);
app.use("/payments", payment);
app.use("/wishlist", wish);
app.get("/images", getImages);

// Test route
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`http://localhost:${port}/`);
  console.log(`Server running on port ${port}`);
});
