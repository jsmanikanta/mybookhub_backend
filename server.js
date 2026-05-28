const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

const userroute = require("./routes/userroute");
const orders = require("./routes/ordersroute");
const admin = require("./routes/adminroute");
const books = require("./routes/bookroute");
const papers = require("./routes/papersroute");
const coupon = require("./routes/couponroute");
const location = require("./routes/locationroute");
const payment = require("./routes/paymentroute");
const wish = require("./routes/wishroute");
const { getImages } = require("./getimages");

dotenv.config();

const app = express();

app.use(cors({
   origin: [
      "https://mybookhub.store",
      "https://printkart.mybookhub.store"
   ],
   credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose
  .connect(process.env.database)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Database connection error:", err));

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

app.get("/", (req, res) => {
  res.send("Server is running");
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
