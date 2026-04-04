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
  convertir,
} = require("../controllers/licenciaController");
const { obtenerEstado } = require("../services/licenciaService");

const router = express.Router();

// GET /api/licencia/estado
router.get("/licencia/estado", async (req, res) => {
  try {
    const { nit, instalacion_hash } = req.query;

    // Validaciones básicas
    if (!nit || !instalacion_hash) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit' e 'instalacion_hash' son requeridos",
      });
    }

    const resultado = await obtenerEstado(nit, instalacion_hash);

    if (resultado.error) {
      const statusCode =
        resultado.error === "no_autorizado" ? 401 : 400;
      return res.status(statusCode).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en obtener estado de licencia:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
});

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
// Ahora maneja todo el flujo: crea licencia si no existe, aplica tipo_licencia, dias_demo, dias_licencia
router.post("/licencias/activar-online", activarEnLinea);

// POST /api/licencias/convertir (conversión de licencia - pendiente de activación)
router.post("/licencias/convertir", convertir);

module.exports = router;
