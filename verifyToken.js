const User = require("./models/user");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = req.headers.token || (authHeader && authHeader.split(" ")[1]);

  if (!token) {
    console.warn("[verifyToken] Missing token", {
      method: req.method,
      path: req.originalUrl,
    });
    return res.status(401).json({ error: "Token is required" });
  }

  try {
    console.log("[verifyToken] Verifying request", {
      method: req.method,
      path: req.originalUrl,
    });

    const secretkey = process.env.SECRETKEY;
    const decoded = jwt.verify(token, secretkey);

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.warn("[verifyToken] User not found for decoded token", {
        userId: decoded.userId,
        path: req.originalUrl,
      });
      return res.status(404).json({ error: "User not found" });
    }

    req.userId = user._id;
    req.user = user;
    console.log("[verifyToken] Token verified", {
      userId: String(user._id),
      path: req.originalUrl,
    });
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      console.warn("[verifyToken] Token expired", {
        path: req.originalUrl,
      });
      return res
        .status(401)
        .json({ error: "Token expired, please login again" });
    }
    console.error("[verifyToken] Invalid token", error);
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = {
  verifyToken,
};
