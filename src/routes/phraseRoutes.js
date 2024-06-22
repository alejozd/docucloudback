const express = require("express");
const { getPhrase } = require("../controllers/phraseController");

const router = express.Router();

router.get("/proxy-phrase", getPhrase);

module.exports = router;
