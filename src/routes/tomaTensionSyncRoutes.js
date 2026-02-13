const express = require("express");
const {
  syncTomaTension,
  getTomaTensionSync,
} = require("../controllers/tomaTensionSyncController");

const router = express.Router();

router.post("/toma-tension/sync", syncTomaTension);
router.get("/toma-tension/sync", getTomaTensionSync);

module.exports = router;
