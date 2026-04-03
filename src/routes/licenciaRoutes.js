const express = require("express");
const {
  activar,
  validar,
  generarOffline,
  crear,
  verificarApiKey,
  registrar,
  generarCodigo,
  activarEnLinea,
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

// POST /api/licencias/registrar (registro con código firmado HMAC SHA256)
router.post("/licencias/registrar", registrar);

// POST /api/licencias/generar-codigo (protegido con API KEY - solo admin)
router.post("/licencias/generar-codigo", verificarApiKey, generarCodigo);

// POST /api/licencia/activar-online (activación online sin exponer código)
router.post("/licencia/activar-online", activarEnLinea);

module.exports = router;
