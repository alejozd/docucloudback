const axios = require('axios');
const { parseFSEXml } = require('../utils/xml-parser');

/**
 * Servicio de comunicación con FSEconomy Data Feeds API
 * Consulta y parsea información de FBOs, aeronaves y pagos
 */
class FSEconomyService {
  constructor(userKey, readKey) {
    if (!userKey || !readKey) {
      throw new Error('FSE_USERKEY y FSE_READ_KEY son requeridos');
    }

    this.userKey = userKey;
    this.readKey = readKey;
    this.baseURL = 'https://fseconomy.net/datafeed';
    this.timeout = 10000; // 10 segundos timeout
  }

  /**
   * Construye URL para consulta de Data Feed
   * @param {string} query - Tipo de consulta (fbos, aircraft, etc.)
   * @param {Object} params - Parámetros adicionales
   * @returns {string} URL completa
   */
  _buildUrl(query, params = {}) {
    const queryParams = new URLSearchParams({
      userkey: this.userKey,
      key: this.readKey,
      query: query,
      ...params
    });

    return `${this.baseURL}?${queryParams.toString()}`;
  }

  /**
   * Realiza petición HTTP a FSEconomy API
   * @param {string} url - URL de la petición
   * @returns {Promise<string>} Respuesta XML cruda
   */
  async _fetchXml(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'Accept': 'application/xml'
        }
      });

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('❌ Timeout en petición FSEconomy (10s)');
        throw new Error('FSEconomy API timeout - intenta nuevamente');
      }
      console.error('❌ Error en petición FSEconomy:', error.message);
      throw new Error('Error conectando con FSEconomy API');
    }
  }

  /**
   * Obtiene lista de FBOs del usuario
   * @returns {Promise<Array>} Array de FBOs con información detallada
   */
  async getMyFBOs() {
    try {
      const url = this._buildUrl('fbos', { search: 'key' });
      const xmlData = await this._fetchXml(url);
      const fbos = await parseFSEXml(xmlData, 'fbos');

      // Enriquecer datos con cálculos adicionales
      return fbos.map(fbo => ({
        ...fbo,
        fuelStatus: this._getFuelStatus(fbo.supplies, fbo.daysOfSupplies),
        needsAttention: fbo.daysOfSupplies < 30
      }));
    } catch (error) {
      console.error('❌ Error obteniendo FBOs:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene estado de una aeronave específica por registro
   * @param {string} registration - Matrícula de la aeronave
   * @returns {Promise<Object>} Información de la aeronave
   */
  async getAircraftStatus(registration) {
    try {
      const url = this._buildUrl('aircraft', { search: 'reg', tailnum: registration });
      const xmlData = await this._fetchXml(url);
      const aircraft = await parseFSEXml(xmlData, 'aircraft');

      if (!aircraft || aircraft.length === 0) {
        throw new Error(`Aeronave ${registration} no encontrada`);
      }

      return aircraft[0];
    } catch (error) {
      console.error(`❌ Error obteniendo estado de ${registration}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene flota completa de aeronaves del usuario
   * @returns {Promise<Array>} Array de aeronaves
   */
  async getFleet() {
    try {
      const url = this._buildUrl('aircraft', { search: 'key' });
      const xmlData = await this._fetchXml(url);
      return await parseFSEXml(xmlData, 'aircraft');
    } catch (error) {
      console.error('❌ Error obteniendo flota:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene pagos por mes y año
   * @param {number} month - Mes (1-12)
   * @param {number} year - Año (ej: 2024)
   * @returns {Promise<Array>} Array de pagos
   */
  async getPaymentsByMonth(month, year) {
    try {
      const url = this._buildUrl('payments', {
        month: month,
        year: year
      });
      const xmlData = await this._fetchXml(url);
      return await parseFSEXml(xmlData, 'payments');
    } catch (error) {
      console.error('❌ Error obteniendo pagos:', error.message);
      throw error;
    }
  }

  /**
   * Determina estado del combustible basado en suministros
   * @param {number} supplies - Suministros actuales
   * @param {number} daysOfSupplies - Días restantes
   * @returns {string} Estado del combustible
   */
  _getFuelStatus(supplies, daysOfSupplies) {
    if (daysOfSupplies >= 90) return 'excellent';
    if (daysOfSupplies >= 60) return 'good';
    if (daysOfSupplies >= 30) return 'fair';
    if (daysOfSupplies >= 14) return 'low';
    if (daysOfSupplies >= 7) return 'critical';
    return 'emergency';
  }

  /**
   * Verifica si hay alertas críticas en los FBOs
   * @param {Array} fbos - Lista de FBOs
   * @returns {Object} Resumen de alertas
   */
  checkAlerts(fbos) {
    const alerts = {
      critical: [], // < 7 días
      warning: [],  // 7-30 días
      info: []      // 30-60 días
    };

    fbos.forEach(fbo => {
      if (fbo.daysOfSupplies < 7) {
        alerts.critical.push(fbo);
      } else if (fbo.daysOfSupplies < 30) {
        alerts.warning.push(fbo);
      } else if (fbo.daysOfSupplies < 60) {
        alerts.info.push(fbo);
      }
    });

    return alerts;
  }
}

module.exports = FSEconomyService;
