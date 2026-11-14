const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { generarClaveErp } = require("../controllers/erpController");

const router = express.Router();

// Genera la clave de ingreso de Helisa contable. Protegida con JWT (igual que generateReportKey).
router.post("/erp/generar-clave", authenticateToken, generarClaveErp);

module.exports = router;
