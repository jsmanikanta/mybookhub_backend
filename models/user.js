const mongoose = require("mongoose");

const userschema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  birthday: {
    type: Date,
  },
  usertype: {
    type: String,
    enum: ["vendor", "user"],
    default: "user",
  },
  college: {
    type: String,
  },
  year: {
    type: String,
  },
  branch: {
    type: String,
  },
  rollno: {
    type: String,
  },
});

const User = mongoose.model("user", userschema);

module.exports = User;
