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
  normalizeTags: false  // NO normalizar tags - FSE usa PascalCase (FboId, Icao, etc.)
});

/**
 * Parsea XML de FSEconomy a JSON según el tipo de consulta
 * @param {string} xmlString - XML crudo de FSEconomy
 * @param {string} type - Tipo de dato: 'fbos', 'aircraft', 'payments'
 * @returns {Promise<Array|Object>} JSON limpio y tipado
 */
const parseFSEXml = async (xmlString, type) => {
  try {
    // Debug log temporal para validar XML recibido
    console.log('🔍 FSE Raw XML (first 300 chars):', xmlString.substring(0, 300));
    
    const result = await parser.parseStringPromise(xmlString);
    
    // Manejar diferentes estructuras de respuesta
    switch (type) {
      case 'fbos':
        const fbos = parseFBOs(result);
        console.log('✅ Parsed', fbos.length, 'FBOs:', fbos.map(f => f.icao));
        return fbos;
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
  // Estructura real de FSEconomy: <FboItems><FBO>...</FBO></FboItems>
  const fboItems = data.FboItems;
  if (!fboItems) return [];
  
  let fboList = fboItems.FBO;
  if (!fboList) return [];
  
  // Normalizar a array cuando hay un solo FBO (explicitArray: false)
  if (!Array.isArray(fboList)) {
    fboList = [fboList];
  }
  
  // Filtrar y mapear campos en PascalCase según estructura real de FSE
  return fboList
    .filter(fbo => fbo && fbo.Icao)
    .map(fbo => ({
      fboId: parseInt(fbo.FboId) || null,
      icao: fbo.Icao || '',
      name: fbo.Name || 'Unknown',
      supplies: parseFloat(fbo.Supplies) || 0,
      suppliesPerDay: parseFloat(fbo.SuppliesPerDay) || 0,
      daysOfSupplies: fbo.SuppliesPerDay > 0 
        ? parseFloat(fbo.Supplies) / parseFloat(fbo.SuppliesPerDay) 
        : null,
      fuelJetA: parseFloat(fbo.FuelJetA) || 0,
      fuel100LL: parseFloat(fbo.Fuel100LL) || 0,
      status: fbo.Status || 'unknown',
      groundCrewFees: parseFloat(fbo.GroundCrewFees) || 0,
      location: fbo.Location || ''
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
