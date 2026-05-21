const axios = require('axios');
const { parseFSEXml } = require('../utils/xml-parser');
const DebugLogger = require('../utils/debug-logger');

/**
 * Servicio de comunicación con FSEconomy Data Feeds API
 */
class FSEconomyService {
  constructor(userKey, readKey) {
    if (!userKey || !readKey) {
      throw new Error('FSE_USERKEY y FSE_READ_KEY son requeridos');
    }

    this.userKey = userKey;
    this.readKey = readKey;
    // ✅ URL oficial para Data Feeds (la que funciona en getMyFBOs)
    this.baseURL = 'https://server.fseconomy.net/data';
    this.timeout = 15000; // 15 segundos
  }

  /**
   * Construye URL para consulta de Data Feed (formato oficial FSE)
   */
  _buildUrl(query, search, extraParams = {}) {
    const params = {
      userkey: this.userKey,
      format: 'xml',
      query,
      search,
      readaccesskey: this.readKey,
      ...extraParams
    };

    Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
    return `${this.baseURL}?${new URLSearchParams(params).toString()}`;
  }

  async _fetchXml(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: { Accept: 'application/xml' }
      });
      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('FSEconomy API timeout - intenta nuevamente');
      }
      throw new Error('Error conectando con FSEconomy API');
    }
  }

  async getMyFBOs() {
    try {
      DebugLogger.log('FSE', 'getMyFBOs() llamado');
      const fullUrl = this._buildUrl('fbos', 'key');
      const response = await axios.get(fullUrl, {
        timeout: 20000,
        headers: {
          Accept: 'application/xml, text/xml, */*',
          'User-Agent': `ZAM-AIR-Bot/1.0 (Node.js/${process.version})`
        }
      });
      const fbos = await parseFSEXml(response.data, 'fbos');
      DebugLogger.log('FSE', `Parsed ${fbos.length} FBOs successfully`);
      return fbos;
    } catch (error) {
      DebugLogger.error('FSE', 'Error en getMyFBOs', error);
      throw new Error(`Error conectando con FSEconomy API: ${error.message}`);
    }
  }

  async getAircraftStatus(registration) {
    const url = this._buildUrl('aircraft', 'reg', { tailnum: registration });
    const xmlData = await this._fetchXml(url);
    const aircraft = await parseFSEXml(xmlData, 'aircraft');
    if (!aircraft || aircraft.length === 0) throw new Error(`Aeronave ${registration} no encontrada`);
    return aircraft[0];
  }

  async getFleet() {
    const url = this._buildUrl('aircraft', 'key');
    const xmlData = await this._fetchXml(url);
    return parseFSEXml(xmlData, 'aircraft');
  }

  async getPaymentsByMonth(month, year) {
    try {
      DebugLogger.log('FSE', `Fetching payments for ${month}/${year}`);
      const url = this._buildUrl('payments', 'monthyear', {
        month: String(month).padStart(2, '0'),
        year: String(year)
      });
      const xmlData = await this._fetchXml(url);
      return await parseFSEXml(xmlData, 'payments');
    } catch (error) {
      DebugLogger.error('FSE', 'Error obteniendo pagos', error);
      throw error;
    }
  }

  async getGroundCrewFeesByMonth(month, year) {
    try {
      const url = this._buildUrl('payments', 'monthyear', {
        month: String(month).padStart(2, '0'),
        year: String(year)
      });
      const xmlData = await this._fetchXml(url);
      const payments = await parseFSEXml(xmlData, 'payments');
      const feesByFbo = {};
      const groundCrewPayments = payments.filter((p) =>
        p.type?.toLowerCase?.()?.includes('ground') || p.description?.toLowerCase?.()?.includes('ground crew')
      );
      for (const payment of groundCrewPayments) {
        const icao = payment.airportIcao || 'UNKNOWN';
        const amount = parseFloat(payment.amount) || 0;
        feesByFbo[icao] = (feesByFbo[icao] || 0) + amount;
      }
      return feesByFbo;
    } catch (error) {
      DebugLogger.error('FSE', 'Error fetching ground crew fees', error);
      return {};
    }
  }

  /**
   * Obtiene estadísticas personales del usuario
   */
  async getStatistics() {
    try {
      DebugLogger.log('FSE', 'getStatistics() llamado');
      const url = this._buildUrl('statistics', 'key');
      DebugLogger.log('FSE', 'Statistics URL (masked)', url.replace(/key=[^&]+/g, 'key=***'));

      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          Accept: 'application/xml, text/xml',
          'User-Agent': 'ZAM-AIR-API/1.0'
        }
      });

      const stats = await parseFSEXml(response.data, 'statistics');
      const normalized = {
        totalHours: parseFloat(stats.TotalHours || stats.totalhours || stats.hours || 0),
        totalEarnings: parseFloat(stats.TotalEarnings || stats.totalearnings || stats.earnings || 0),
        totalFlights: parseInt(stats.TotalFlights || stats.totalflights || stats.flights || 0, 10),
        totalDistance: parseFloat(stats.TotalDistance || stats.totaldistance || stats.distance || 0),
        memberSince: stats.MemberSince || stats.membersince || stats.joined || null,
        lastFlight: stats.LastFlight || stats.lastflight || stats.last_activity || null,
        averageFlightTime: stats.AverageFlightTime ? parseFloat(stats.AverageFlightTime) : null,
        longestFlight: stats.LongestFlight ? parseFloat(stats.LongestFlight) : null
      };
      return normalized;
    } catch (error) {
      DebugLogger.error('FSE', 'Error en getStatistics', error);
      return {
        totalHours: 0,
        totalEarnings: 0,
        totalFlights: 0,
        totalDistance: 0,
        warning: 'Estadísticas no disponibles temporalmente'
      };
    }
  }

  _getFuelStatus(supplies, daysOfSupplies) {
    if (daysOfSupplies >= 90) return 'excellent';
    if (daysOfSupplies >= 60) return 'good';
    if (daysOfSupplies >= 30) return 'fair';
    if (daysOfSupplies >= 14) return 'low';
    if (daysOfSupplies >= 7) return 'critical';
    return 'emergency';
  }

  checkAlerts(fbos) {
    const alerts = { critical: [], warning: [], info: [] };
    fbos.forEach((fbo) => {
      if (fbo.daysOfSupplies < 7) alerts.critical.push(fbo);
      else if (fbo.daysOfSupplies < 30) alerts.warning.push(fbo);
      else if (fbo.daysOfSupplies < 60) alerts.info.push(fbo);
    });
    return alerts;
  }
}

module.exports = FSEconomyService;
