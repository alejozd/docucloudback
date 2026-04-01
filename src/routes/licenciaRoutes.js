const express = require('express');
const { activar, validar, offline } = require('../controllers/licenciaController');
const { validateApiKey } = require('../middlewares/apiKeyMiddleware');

const router = express.Router();

/**
 * POST /api/licencias/activar
 * Activa una licencia (primera vez → demo)
 */
router.post('/licencias/activar', activar);

/**
 * POST /api/licencias/validar
 * Valida una licencia (uso normal)
 */
router.post('/licencias/validar', validar);

/**
 * POST /api/licencias/offline
 * Genera licencia offline firmada (protegido con API KEY)
 */
router.post('/licencias/offline', validateApiKey, offline);

module.exports = router;
