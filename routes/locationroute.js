const express = require("express");
const router = express.Router();
const { verifyToken } = require("../verifyToken");
const locationcontrol=require("../controllers/locationcontroller");

router.post("/add-location",verifyToken,locationcontrol.addLocation);
router.get("/mylocations",verifyToken,locationcontrol.getLocationsbyId);

module.exports = router;