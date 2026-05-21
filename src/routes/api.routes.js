const express = require('express');
const router = express.Router();
const FSEconomyService = require('../services/fseconomy.service');
const DebugLogger = require('../utils/debug-logger');

// Helper para instanciar servicio (reutiliza vars de entorno)
const getFSE = () => new FSEconomyService(process.env.FSE_USERKEY, process.env.FSE_READ_KEY);

// ✅ GET /api/fbos → Lista completa de FBOs
router.get('/fbos', async (req, res) => {
  try {
    DebugLogger.log('API', 'GET /api/fbos requested');
    const fse = getFSE();
    const fbos = await fse.getMyFBOs();
    res.json({ ok: true, count: fbos.length, data: fbos });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/fbos failed', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo FBOs' });
  }
});

// ✅ GET /api/fees/:month/:year → Fees por mes
router.get('/fees/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month || !year || Number.isNaN(monthNum) || Number.isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ ok: false, error: 'Mes (1-12) y año requeridos' });
    }

    DebugLogger.log('API', `GET /api/fees/${month}/${year} requested`);
    const fse = getFSE();
    const fees = await fse.getGroundCrewFeesByMonth(monthNum, yearNum);
    res.json({ ok: true, month: monthNum, year: yearNum, data: fees });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/fees failed', error);
    res.status(500).json({ ok: false, error: 'Error obteniendo fees' });
  }
});

// ✅ GET /api/alerts → FBOs con supplies < 30 días
router.get('/alerts', async (req, res) => {
  try {
    DebugLogger.log('API', 'GET /api/alerts requested');
    const fse = getFSE();
    const fbos = await fse.getMyFBOs();
    const critical = fbos.filter((f) => f.daysOfSupplies !== null && f.daysOfSupplies < 30);
    res.json({ ok: true, count: critical.length, data: critical });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/alerts failed', error);
    res.status(500).json({ ok: false, error: 'Error verificando alertas' });
  }
});

module.exports = router;
