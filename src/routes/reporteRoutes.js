const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { generateReportKey } = require("../controllers/reporteController"); // Importar la lógica desde el controlador

const router = express.Router();

// Ruta protegida con JWT y llamada a la lógica definida en reporteController.js
router.post("/generateReportKey", authenticateToken, generateReportKey);

module.exports = router;
