const express = require("express");
const router = express.Router();
const grabacionController = require("../controllers/grabacionController");

// Ruta para obtener estado de grabación
router.get("/estado", grabacionController.getEstadoGrabacion);

// Ruta para actualizar estado de grabación
router.post("/estado", express.json(), grabacionController.setEstadoGrabacion);

module.exports = router;
