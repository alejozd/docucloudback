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
const { obtenerEstado, listarLicencias, editarLicencia } = require("../services/licenciaService");
const { authenticateToken } = require("../middlewares/authMiddleware");

const router = express.Router();

// GET /api/licencias/listado (protegido con JWT)
router.get("/licencias/listado", authenticateToken, async (req, res) => {
  try {
    console.log("[GET /api/licencias/listado] Listando todas las licencias");
    
    const licencias = await listarLicencias();
    
    return res.status(200).json({
      ok: true,
      licencias,
    });
  } catch (error) {
    console.error("Error en listar licencias:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
});

// PUT /api/licencias/editar/:id (protegido con JWT)
router.put("/licencias/editar/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const datos = req.body;
    
    console.log(`[PUT /api/licencias/editar/${id}] Editando licencia`);
    
    // Validar que se reciban datos en el body
    if (!datos || Object.keys(datos).length === 0) {
      return res.status(400).json({
        error: "datos_requeridos",
        mensaje: "El body de la solicitud no puede estar vacío",
      });
    }
    
    // Validar que id sea un número válido
    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return res.status(400).json({
        error: "id_invalido",
        mensaje: "El ID de la licencia debe ser un número válido",
      });
    }
    
    const resultado = await editarLicencia(idNum, datos);
    
    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en editar licencia:", error.message);
    
    // Manejar errores específicos
    if (error.message === "no_existe") {
      return res.status(404).json({
        error: "no_existe",
        mensaje: "No existe una licencia con ese ID",
      });
    }
    
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
});

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
