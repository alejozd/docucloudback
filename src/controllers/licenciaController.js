const { activarLicencia, validarLicencia, generarLicenciaOffline } = require('../services/licenciaService');

/**
 * Activa una licencia
 * POST /api/licencias/activar
 */
const activar = async (req, res) => {
  try {
    const { nit, instalacion_hash, app } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash) {
      return res.status(400).json({ error: 'nit e instalacion_hash son requeridos' });
    }

    const resultado = await activarLicencia(nit, instalacion_hash, app);

    return res.json(resultado);
  } catch (error) {
    if (error.message === 'instalacion_invalida') {
      return res.status(400).json({ error: 'instalacion_invalida' });
    }
    console.error('Error en activar licencia:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Valida una licencia
 * POST /api/licencias/validar
 */
const validar = async (req, res) => {
  try {
    const { nit, instalacion_hash } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash) {
      return res.status(400).json({ error: 'nit e instalacion_hash son requeridos' });
    }

    const resultado = await validarLicencia(nit, instalacion_hash);

    return res.json(resultado);
  } catch (error) {
    if (['no_autorizado', 'instalacion_invalida', 'licencia_expirada'].includes(error.message)) {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error en validar licencia:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Genera licencia offline
 * POST /api/licencias/offline
 * Protegido con API KEY
 */
const offline = async (req, res) => {
  try {
    const { nit, instalacion_hash, dias } = req.body;

    // Validaciones básicas
    if (!nit || !instalacion_hash || !dias) {
      return res.status(400).json({ error: 'nit, instalacion_hash y dias son requeridos' });
    }

    const resultado = await generarLicenciaOffline(nit, instalacion_hash, dias);

    return res.json(resultado);
  } catch (error) {
    console.error('Error en generar licencia offline:', error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  activar,
  validar,
  offline,
};
