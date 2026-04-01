<<<<<<< HEAD
const express = require("express");
const { verifyCoupon } = require("../controllers/couponstatus");
const { verifyToken } = require("../verifyToken");

const router = express.Router();

router.post("/verify", verifyToken, verifyCoupon);

module.exports = router;
=======
const express = require("express");
const { verifyCoupon } = require("../controllers/couponstatus");
const { verifyToken } = require("../verifyToken");

const router = express.Router();

router.post("/verify", verifyToken, verifyCoupon);

module.exports = router;
>>>>>>> f85a39af7c7f6d11489c7715fab55327e17b35b3
