const {
  activarLicencia,
  validarLicencia,
  generarLicenciaOffline,
  crearLicencia,
  registrarLicencia,
  generarCodigoLicencia,
} = require("../services/licenciaService");

// Controlador para activar licencia
const activar = async (req, res) => {
  try {
    const { nit, instalacion_hash, app } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit' e 'instalacion_hash' son requeridos",
      });
    }

    const resultado = await activarLicencia(nit, instalacion_hash, app);

    if (resultado.error) {
      return res.status(400).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en activar licencia:", error.message);
    
    // Manejar errores específicos
    if (error.message === "no_autorizado") {
      return res.status(401).json({
        error: "no_autorizado",
        mensaje: "No existe una licencia registrada para este NIT. Contacte al administrador.",
      });
    }
    
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

// Controlador para validar licencia
const validar = async (req, res) => {
  try {
    const { nit, instalacion_hash } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit' e 'instalacion_hash' son requeridos",
      });
    }

    const resultado = await validarLicencia(nit, instalacion_hash);

    if (resultado.error) {
      const statusCode =
        resultado.error === "no_autorizado" ? 401 : 400;
      return res.status(statusCode).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en validar licencia:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

// Middleware para verificar API KEY
const verificarApiKey = (req, res, next) => {
  const apiKeyHeader = req.headers["authorization"];
  const expectedApiKey = process.env.API_KEY;

  if (!apiKeyHeader) {
    return res.status(401).json({
      error: "no_autorizado",
      mensaje: "Falta el header Authorization",
    });
  }

  // Extraer token del formato "Bearer <API_KEY>"
  const token = apiKeyHeader.split(" ")[1];

  if (!token || token !== expectedApiKey) {
    return res.status(403).json({
      error: "acceso_denegado",
      mensaje: "API Key inválida",
    });
  }

  next();
};

// Controlador para generar licencia offline
const generarOffline = async (req, res) => {
  try {
    const { nit, instalacion_hash, dias } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash || !dias) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit', 'instalacion_hash' y 'dias' son requeridos",
      });
    }

    if (typeof dias !== "number" || dias <= 0) {
      return res.status(400).json({
        error: "valor_invalido",
        mensaje: "El campo 'dias' debe ser un número positivo",
      });
    }

    const resultado = await generarLicenciaOffline(nit, instalacion_hash, dias);

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en generar licencia offline:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

// Controlador para crear licencia (solo admin)
const crear = async (req, res) => {
  try {
    const { nit, app, dias_demo } = req.body;

    // Validaciones básicas
    if (!nit || !app) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit' y 'app' son requeridos",
      });
    }

    const dias = dias_demo || 15;
    if (typeof dias !== "number" || dias <= 0) {
      return res.status(400).json({
        error: "valor_invalido",
        mensaje: "El campo 'dias_demo' debe ser un número positivo",
      });
    }

    const resultado = await crearLicencia(nit, app, dias);

    return res.status(201).json(resultado);
  } catch (error) {
    console.error("Error en crear licencia:", error.message);
    
    // Manejar errores específicos
    if (error.message === "ya_existe") {
      return res.status(409).json({
        error: "ya_existe",
        mensaje: "Ya existe una licencia registrada para este NIT",
      });
    }
    
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

// Controlador para registrar licencia con código firmado
const registrar = async (req, res) => {
  try {
    const { nit, instalacion_hash, codigo } = req.body;

    if (!nit || !instalacion_hash || !codigo) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit', 'instalacion_hash' y 'codigo' son requeridos",
      });
    }

    const resultado = await registrarLicencia(nit, instalacion_hash, codigo);

    if (resultado.error) {
      return res.status(400).json(resultado);
    }

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error en registrar licencia:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

// Controlador para generar código de licencia firmado (admin)
const generarCodigo = async (req, res) => {
  try {
    const { nit, app, instalacion_hash, dias } = req.body;

    if (!nit || !app || !dias) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "Los campos 'nit', 'app' y 'dias' son requeridos",
      });
    }

    if (!instalacion_hash) {
      return res.status(400).json({
        error: "campos_requeridos",
        mensaje: "El campo 'instalacion_hash' es requerido",
      });
    }

    const resultado = await generarCodigoLicencia(nit, app, instalacion_hash, dias);

    return res.status(200).json(resultado);
  } catch (error) {
    console.error("Error generando código:", error.message);
    return res.status(500).json({
      error: "error_servidor",
      mensaje: error.message,
    });
  }
};

module.exports = {
  activar,
  validar,
  generarOffline,
  crear,
  verificarApiKey,
  registrar,
  generarCodigo,
};
