const express = require("express");
const { syncTomaTension } = require("../controllers/tomaTensionSyncController");

const router = express.Router();

router.post("/toma-tension/sync", syncTomaTension);

module.exports = router;
