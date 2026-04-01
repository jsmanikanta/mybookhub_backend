import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export const resetPasswordWithoutOTP = async (req, res) => {
  const { identifier, newPassword } = req.body;

  if (!identifier || !newPassword)
    return res
      .status(400)
      .json({ error: "Identifier and new password are required" });

  try {
    let user;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (emailRegex.test(identifier)) {
      user = await User.findOne({ email: identifier });
    } else if (phoneRegex.test(identifier)) {
      user = await User.findOne({ mobileNumber: identifier });
    } else {
      return res
        .status(400)
        .json({ error: "Invalid email or phone number format" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    try {
      await resend.emails.send({
        from: "MyBookHub <admin@mybookhub.store>", // must be verified domain
        to: user.email,
        subject: "Your Password Has Been Reset Successfully 🔐",
        html: `
      <h2>Hello ${user.fullname},</h2>

      <p>Your password has been successfully reset for your <b>MyBookHub</b> account.</p>

      <p>If you made this change, no further action is required.</p>

      <p><b>If you did NOT request this password reset, please contact us immediately</b> by replying to this email.</p>

      <p>For security reasons, we recommend keeping your password confidential and avoiding sharing it with anyone.</p>

      <p>Stay secure,<br/>
      <b>The MyBookHub Team</b></p>
    `,
      });

      console.log("Password reset email sent to:", user.email);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    res
      .status(200)
      .json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error resetting password without OTP:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};