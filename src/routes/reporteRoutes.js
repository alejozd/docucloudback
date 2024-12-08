const express = require("express");
const { generateReportKey } = require("../controllers/reporteController");

const router = express.Router();

router.post("/generateReportKey", generateReportKey);

module.exports = router;
