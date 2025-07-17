const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

// Ruta para listar videos y sus metadatos
router.get("/lista", videoController.listarVideos);

module.exports = router;
