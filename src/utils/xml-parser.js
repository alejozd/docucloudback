const { Parser } = require('xml2js');

/**
 * Parser XML para respuestas de FSEconomy Data Feeds
 * Convierte XML a JSON limpio y tipado
 */

// Crear parser con opciones optimizadas para FSEconomy
const parser = new Parser({
  explicitArray: false, // No crear arrays si hay un solo elemento
  mergeAttrs: true,     // Mezclar atributos con elementos
  explicitRoot: false,  // No incluir el nodo raíz
  trim: true,           // Eliminar espacios en blanco
  normalizeTags: true   // Normalizar nombres de tags
});

/**
 * Parsea XML de FSEconomy a JSON según el tipo de consulta
 * @param {string} xmlString - XML crudo de FSEconomy
 * @param {string} type - Tipo de dato: 'fbos', 'aircraft', 'payments'
 * @returns {Promise<Array|Object>} JSON limpio y tipado
 */
const parseFSEXml = async (xmlString, type) => {
  try {
    const result = await parser.parseStringPromise(xmlString);
    
    // Manejar diferentes estructuras de respuesta
    switch (type) {
      case 'fbos':
        return parseFBOs(result);
      case 'aircraft':
        return parseAircraft(result);
      case 'payments':
        return parsePayments(result);
      default:
        return result;
    }
  } catch (error) {
    console.error('❌ Error parsing FSE XML:', error.message);
    throw new Error(`Failed to parse FSE XML: ${error.message}`);
  }
};

/**
 * Parsea respuesta de FBOs
 * @param {Object} data - JSON crudo del parser
 * @returns {Array} Array de FBOs normalizados
 */
const parseFBOs = (data) => {
  // FSE puede devolver un solo FBO o un array
  let fbos = data.fbo || data.FBO || data;
  
  // Si es un solo objeto, convertirlo a array
  if (!Array.isArray(fbos)) {
    fbos = [fbos];
  }
  
  // Filtrar elementos vacíos o inválidos
  return fbos
    .filter(fbo => fbo && fbo.icao)
    .map(fbo => ({
      icao: fbo.icao || '',
      name: fbo.name || 'Unknown',
      supplies: parseInt(fbo.supplies) || 0,
      dailyConsumption: parseFloat(fbo.dailyConsumption) || 0,
      groundCrewFees: parseFloat(fbo.groundCrewFees) || 0,
      fuelStatus: fbo.fuelStatus || 'unknown',
      // Calcular días de suministros restantes
      daysOfSupplies: fbo.dailyConsumption > 0 
        ? Math.round(fbo.supplies / fbo.dailyConsumption) 
        : 999
    }));
};

/**
 * Parsea respuesta de aeronaves
 * @param {Object} data - JSON crudo del parser
 * @returns {Array} Array de aeronaves normalizadas
 */
const parseAircraft = (data) => {
  let aircraft = data.aircraft || data.Aircraft || [];
  
  if (!Array.isArray(aircraft)) {
    aircraft = [aircraft];
  }
  
  return aircraft
    .filter(ac => ac && ac.registration)
    .map(ac => ({
      registration: ac.registration || '',
      type: ac.type || '',
      status: ac.status || 'unknown',
      location: ac.location || '',
      lastFlight: ac.lastFlight || null,
      totalHours: parseFloat(ac.totalHours) || 0,
      engineHours: parseFloat(ac.engineHours) || 0,
      nextInspection: ac.nextInspection || null
    }));
};

/**
 * Parsea respuesta de pagos
 * @param {Object} data - JSON crudo del parser
 * @returns {Array} Array de pagos normalizados
 */
const parsePayments = (data) => {
  let payments = data.payment || data.Payment || [];
  
  if (!Array.isArray(payments)) {
    payments = [payments];
  }
  
  return payments
    .filter(p => p && p.date)
    .map(p => ({
      date: p.date || '',
      amount: parseFloat(p.amount) || 0,
      description: p.description || '',
      currency: p.currency || 'USD',
      reference: p.reference || ''
    }));
};

module.exports = { parseFSEXml };
