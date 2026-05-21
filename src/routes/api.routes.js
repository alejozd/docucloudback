const express = require('express');
const axios = require('axios');
const router = express.Router();
const FSEconomyService = require('../services/fseconomy.service');
const DebugLogger = require('../utils/debug-logger');
const xmlParser = require('../utils/xml-parser');

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

// ✅ GET /api/aircraft → Lista de aeronaves del owner
router.get('/aircraft', async (req, res) => {
  try {
    DebugLogger.log('API', 'GET /api/aircraft requested');

    const response = await axios.get('https://server.fseconomy.net/data', {
      params: {
        userkey: process.env.FSE_USERKEY,
        format: 'xml',
        query: 'aircraft',
        search: 'ownername',
        ownername: 'alejozd',
        readaccesskey: process.env.FSE_READ_KEY,
      },
      timeout: 15000,
      headers: { Accept: 'application/xml', 'User-Agent': 'ZAM-AIR-API/1.0' },
    });

    const aircraft = await xmlParser.parseFSEXml(response.data, 'aircraft');

    const formatted = aircraft.map((ac) => ({
      registration: ac.Registration || ac.registration,
      makeModel: ac.MakeModel || ac.makemodel,
      location: ac.Location || ac.location,
      homeBase: ac.HomeBase || ac.homebase,
      fuelLevel: parseFloat(ac.FuelLevel || ac.fuellevel) || 0,
      engineHours: parseFloat(ac.EngineHours || ac.enginehours) || 0,
      hoursTo100Hr: ac.HoursTo100Hr ? parseFloat(ac.HoursTo100Hr) : null,
      rentalPrice: ac.RentalPrice ? parseFloat(ac.RentalPrice) : null,
      monthlyFee: ac.MonthlyFee ? parseFloat(ac.MonthlyFee) : 0,
      status: ac.Status || 'Active',
    }));

    res.json({ ok: true, count: formatted.length, data: formatted });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/aircraft failed', error);
    res.json({ ok: true, count: 0, data: [], warning: 'Datos de aircraft no disponibles' });
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

// ✅ GET /api/flights/:month/:year → Flight logs del usuario
router.get('/flights/:month/:year', async (req, res) => {
  try {
    const { month, year } = req.params;
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!month || !year || Number.isNaN(monthNum) || Number.isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ ok: false, error: 'Mes (1-12) y año requeridos' });
    }

    DebugLogger.log('API', `GET /api/flights/${month}/${year} requested`);

    const response = await axios.get('https://server.fseconomy.net/data', {
      params: {
        userkey: process.env.FSE_USERKEY,
        format: 'xml',
        query: 'flightlogs',
        search: 'monthyear',
        readaccesskey: process.env.FSE_READ_KEY,
        month: String(monthNum).padStart(2, '0'),
        year: String(yearNum),
      },
      timeout: 20000,
      headers: { Accept: 'application/xml', 'User-Agent': 'ZAM-AIR-API/1.0' },
    });

    const flights = await xmlParser.parseFSEXml(response.data, 'flightlogs');

    const formatted = flights.map((f) => ({
      date: f.Date || f.date,
      aircraft: f.Aircraft || f.aircraft,
      route: `${f.DepartureIcao || f.from} → ${f.ArrivalIcao || f.to}`,
      duration: f.Duration || f.duration,
      earnings: parseFloat(f.Earnings || f.earnings) || 0,
      assignments: parseInt(f.Assignments || f.assignments, 10) || 0,
      distance: parseFloat(f.Distance || f.distance) || 0,
    }));

    formatted.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ ok: true, month: monthNum, year: yearNum, count: formatted.length, data: formatted });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/flights failed', error);
    res.json({ ok: true, count: 0, data: [], warning: 'Flight logs no disponibles' });
  }
});

// ✅ GET /api/stats → Resumen estadístico del usuario
router.get('/stats', async (req, res) => {
  try {
    DebugLogger.log('API', 'GET /api/stats requested');

    const response = await axios.get('https://server.fseconomy.net/data', {
      params: {
        userkey: process.env.FSE_USERKEY,
        format: 'xml',
        query: 'statistics',
        search: 'key',
        readaccesskey: process.env.FSE_READ_KEY,
      },
      timeout: 15000,
      headers: { Accept: 'application/xml', 'User-Agent': 'ZAM-AIR-API/1.0' },
    });

    const stats = await xmlParser.parseFSEXml(response.data, 'statistics');

    const formatted = {
      totalHours: parseFloat(stats.TotalHours || stats.totalhours || stats.TotalHoursFlown || 0),
      totalEarnings: parseFloat(stats.TotalEarnings || stats.totalearnings || 0),
      totalFlights: parseInt(stats.TotalFlights || stats.totalflights || 0, 10),
      totalDistance: parseFloat(stats.TotalDistance || stats.totaldistance || 0),
      memberSince: stats.MemberSince || stats.membersince || 'Unknown',
      lastFlight: stats.LastFlight || stats.lastflight || null,
    };

    res.json({ ok: true, data: formatted });
  } catch (error) {
    DebugLogger.error('API', 'GET /api/stats failed', error);
    res.json({
      ok: true,
      data: {
        totalHours: 0,
        totalEarnings: 0,
        totalFlights: 0,
        totalDistance: 0,
        warning: 'Estadísticas no disponibles',
      },
    });
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
