const dotenv = require("dotenv");
dotenv.config();

const Location = require("../models/location");
const User = require("../models/user");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const addLocation = async (req, res) => {
  const userId = req.userId;

  const { name, mobilenumber, state, district, pincode, address, landmark } =
    req.body;

  if (!userId) {
    return res.status(400).json({ error: "User ID missing from token" });
  }

  try {
    const newloction = new Location({
      name,
      mobilenumber,
      state,
      district,
      pincode,
      address,
      landmark,
      userid: userId,
    });

    await newloction.save();

    return res.status(201).json({
      message: "Location registered successfully!",
      location: newloction,
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getLocationsbyId = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID missing from token" });
    }

    const user = await User.findById(userId).select(
      "fullname mobileNumber email"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const locations = await Location.find({ userid: userId }).select(
      "name mobilenumber state district pincode address landmark"
    );

    return res.status(200).json({
      user: {
        fullname: user.fullname,
        mobileNumber: user.mobileNumber,
        email: user.email,
      },
      locations: locations.map((location) => ({
        name: location.name,
        mobilenumber: location.mobilenumber,
        state: location.state,
        district: location.district,
        pincode: location.pincode,
        address: location.address,
        landmark: location.landmark,
      })),
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addLocation,
  getLocationsbyId,
};