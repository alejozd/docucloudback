const express = require("express");
const {
  syncTomaTension,
  getTomaTensionSync,
} = require("../controllers/tomaTensionSyncController");
const { authenticateApiKey } = require("../middlewares/apiKeyMiddleware");

const router = express.Router();

router.post("/toma-tension/sync", authenticateApiKey, syncTomaTension);
router.get("/toma-tension/sync", authenticateApiKey, getTomaTensionSync);

module.exports = router;
