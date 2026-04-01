const express = require('express');
const { activar, validar, offline } = require('../controllers/licenciaController');
const { validateApiKey } = require('../middlewares/apiKeyMiddleware');

const router = express.Router();

/**
 * POST /licencias/activar
 * Activa una licencia (primera vez → demo)
 */
router.post('/activar', activar);

/**
 * POST /licencias/validar
 * Valida una licencia (uso normal)
 */
router.post('/validar', validar);

/**
 * POST /licencias/offline
 * Genera licencia offline firmada (protegido con API KEY)
 */
router.post('/offline', validateApiKey, offline);

module.exports = router;
