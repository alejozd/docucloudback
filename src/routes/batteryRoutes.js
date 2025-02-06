const express = require("express");
const router = express.Router();
const { getBatteryStatus } = require("../controllers/batteryController");

router.get("/battery", getBatteryStatus);

module.exports = router;
