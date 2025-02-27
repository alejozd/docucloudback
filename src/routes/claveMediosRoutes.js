const express = require("express");
const router = express.Router();
const claveMediosController = require("../controllers/claveMediosController");

// Ruta POST para generar la clave desde el serial
router.post("/generar-clave", claveMediosController.generarClaveDesdeSerial);

module.exports = router;
