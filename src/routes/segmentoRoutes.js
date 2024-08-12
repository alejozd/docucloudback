const express = require("express");
const router = express.Router();
const segmentoController = require("../controllers/segmentoController");

router.get("/segmentos", segmentoController.getSegmentos);

module.exports = router;
