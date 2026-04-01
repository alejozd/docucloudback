const express = require("express");
const {
  activar,
  validar,
  generarOffline,
  crear,
  verificarApiKey,
} = require("../controllers/licenciaController");

const router = express.Router();

// POST /api/licencias/activar
router.post("/licencias/activar", activar);

// POST /api/licencias/validar
router.post("/licencias/validar", validar);

// POST /api/licencias/offline (protegido con API KEY)
router.post("/licencias/offline", verificarApiKey, generarOffline);

// POST /api/licencias/crear (protegido con API KEY - solo admin)
router.post("/licencias/crear", verificarApiKey, crear);

module.exports = router;
