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
    let startTime;
    try {
      console.log('🔍 [FSE-DEBUG-START] getMyFBOs() llamado');
      
      // 1. Validar keys ANTES de hacer la petición
      if (!this.userKey || !this.readKey) {
        console.error('❌ [FSE-DEBUG] Keys faltantes:', { 
          userKey: !!this.userKey, 
          readKey: !!this.readKey 
        });
        throw new Error('FSE keys no configuradas');
      }
      
      // 2. Construir URL completa para logging
      const queryString = new URLSearchParams({
        userkey: this.userKey,
        format: 'xml',
        query: 'fbos',
        search: 'key',
        readaccesskey: this.readKey
      }).toString();
      const fullUrl = `https://server.fseconomy.net/data?${queryString}`;
      
      console.log('🔍 [FSE-DEBUG] URL completa (masked):', fullUrl.replace(/key=[^&]+/g, 'key=***'));
      console.log('🔍 [FSE-DEBUG] User-Agent del proceso:', process.env.NODE_ENV, process.version);
      
      // 3. Crear instancia axios con configuración EXPLÍCITA y hooks de logging
      const axios = require('axios');
      const https = require('https');
      
      const instance = axios.create({
        timeout: 20000, // 20 segundos
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'ZAM-AIR-Bot/1.0 (Node.js/' + process.version + ')'
        },
        httpsAgent: new https.Agent({
          rejectUnauthorized: true,
          keepAlive: true,
          timeout: 15000
        }),
        // Hooks para logging de la petición real
        transformRequest: [(data, headers) => {
          console.log('📤 [FSE-DEBUG] Axios transformRequest - Headers:', JSON.stringify(headers));
          return data;
        }]
      });
      
      // 4. Interceptors para logging de request/response
      instance.interceptors.request.use(config => {
        console.log('📤 [FSE-DEBUG] Request interceptor - URL:', config.url);
        console.log('📤 [FSE-DEBUG] Request interceptor - baseURL:', config.baseURL);
        console.log('📤 [FSE-DEBUG] Request interceptor - params:', config.params);
        return config;
      }, error => {
        console.error('❌ [FSE-DEBUG] Request interceptor ERROR:', error.message);
        return Promise.reject(error);
      });
      
      instance.interceptors.response.use(response => {
        console.log('📥 [FSE-DEBUG] Response interceptor - Status:', response.status);
        console.log('📥 [FSE-DEBUG] Response interceptor - Headers:', JSON.stringify(response.headers));
        console.log('📥 [FSE-DEBUG] Response data type:', typeof response.data);
        console.log('📥 [FSE-DEBUG] Response first 150 chars:', String(response.data).substring(0, 150));
        return response;
      }, error => {
        console.error('❌ [FSE-DEBUG] Response interceptor ERROR:', {
          name: error.name,
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          hasResponse: !!error.response,
          hasConfig: !!error.config,
          responseStatus: error.response?.status,
          responseData: error.response?.data?.substring?.(0, 100),
          configUrl: error.config?.url,
          configBaseURL: error.config?.baseURL
        });
        return Promise.reject(error);
      });
      
      // 5. Hacer la petición REAL
      console.log('📡 [FSE-DEBUG] Ejecutando axios.get()...');
      startTime = Date.now();
      
      const response = await instance.get('', { 
        params: {
          userkey: this.userKey,
          format: 'xml',
          query: 'fbos',
          search: 'key',
          readaccesskey: this.readKey
        }
      });
      
      const duration = Date.now() - startTime;
      console.log(`✅ [FSE-DEBUG] Petición completada en ${duration}ms - Status: ${response.status}`);
      
      // 6. Parsear con xml-parser
      const xmlParser = require('../utils/xml-parser');
      const fbos = await xmlParser.parseFSEXml(response.data, 'fbos');
      
      console.log(`✅ [FSE-DEBUG-END] Parsed ${fbos.length} FBOs successfully`);
      return fbos;
      
    } catch (error) {
      const duration = Date.now() - (startTime || Date.now());
      console.error('❌ [FSE-DEBUG-ERROR] Final catch:', {
        message: error.message,
        name: error.name,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        duration: duration + 'ms',
        hasResponse: !!error.response,
        hasRequest: !!error.request,
        hasConfig: !!error.config,
        responseStatus: error.response?.status,
        responseDataPreview: typeof error.response?.data === 'string' ? error.response.data.substring(0, 150) : typeof error.response?.data,
        requestInfo: error.request ? {
          host: error.request.host,
          path: error.request.path,
          method: error.request.method
        } : null,
        configInfo: error.config ? {
          url: error.config.url,
          baseURL: error.config.baseURL,
          params: error.config.params?.userkey ? '***' : error.config.params
        } : null,
        stack: error.stack?.split('\n').slice(0, 5)
      });
      throw new Error('Error conectando con FSEconomy API: ' + error.message);
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
