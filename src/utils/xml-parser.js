// src/utils/xml-parser.js
const { parseStringPromise } = require('xml2js');
const DebugLogger = require('./debug-logger');

/**
 * Parsea respuestas XML de FSEconomy Data Feeds
 * @param {string} xmlString - Respuesta XML cruda de FSEconomy
 * @param {'fbos'|'aircraft'|'payments'} type - Tipo de consulta
 * @returns {Array|Object} Datos parseados en JSON
 */
async function parseFSEXml(xmlString, type) {
  try {
    // 🔍 DEBUG: Logear entrada para diagnóstico
    DebugLogger.log('PARSER', `Input type: ${type} | XML length: ${xmlString?.length || 0}`);
    DebugLogger.log('PARSER', 'XML preview', xmlString?.substring(0, 200));

    const result = await parseStringPromise(xmlString, {
      explicitArray: false,  // Evita arrays innecesarios para un solo elemento
      mergeAttrs: true,      // Combina atributos con elementos
      trim: true,            // Elimina espacios extra
      explicitRoot: true     // Mantiene el nodo raíz
    });

    // 🔍 DEBUG: Logear estructura parseada
    DebugLogger.log('PARSER', 'Parsed root keys', Object.keys(result || {}));

    // ✅ Manejar respuestas de error de FSEconomy (<Error> tag)
    if (result?.Error || result?.error) {
      const errorMsg = result.Error || result.error;
      DebugLogger.warn('PARSER', 'FSE returned error response', { error: errorMsg });
      return type === 'fbos' ? [] : {}; // Retornar vacío seguro según tipo
    }

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
    DebugLogger.error('PARSER', 'Parse error', error);
    throw new Error(`XML parse error: ${error.message}`);
  }
}

/**
 * Parsea la respuesta de FBOs: <FboItems><FBO>...</FBO></FboItems>
 * Estructura REAL de FSEconomy (PascalCase, no minúsculas)
 */
function parseFBOs(parsed) {
  DebugLogger.log('PARSER', 'parseFBOs() called', { rootKeys: Object.keys(parsed || {}) });
  
  // ✅ Estructura real: { FboItems: { FBO: [...] } } o { FboItems: { FBO: {...} } }
  const fboItems = parsed?.FboItems;
  
  if (!fboItems) {
    DebugLogger.warn('PARSER', 'No <FboItems> found', { availableKeys: Object.keys(parsed || {}) });
    return [];
  }

  let fboList = fboItems.FBO;
  
  // Manejar caso de un solo FBO (xml2js con explicitArray: false devuelve objeto, no array)
  if (!fboList) {
    DebugLogger.log('PARSER', 'No <FBO> found inside <FboItems>');
    return [];
  }
  
  // Normalizar a array si es un solo objeto
  if (!Array.isArray(fboList)) {
    DebugLogger.log('PARSER', 'Single FBO detected, normalizing to array');
    fboList = [fboList];
  }
  
  DebugLogger.log('PARSER', `Processing ${fboList.length} FBO(s)`);

  const result = fboList.map((fbo, index) => {
    DebugLogger.log('PARSER', `FBO #${index + 1} keys`, Object.keys(fbo || {}));
    
    return {
      // Mapear campos PascalCase → camelCase para consistencia interna
      fboId: parseInt(fbo.FboId) || null,
      status: fbo.Status,
      airport: fbo.Airport,
      name: fbo.Name,
      owner: fbo.Owner,
      icao: fbo.Icao,                    // ← Clave para identificar FBOs
      location: fbo.Location,
      lots: parseInt(fbo.Lots) || 0,
      repairShop: fbo.RepairShop === 'Yes',
      gates: parseInt(fbo.Gates) || 0,
      gatesRented: parseInt(fbo.GatesRented) || 0,
      fuel100LL: parseFloat(fbo.Fuel100LL) || 0,
      fuelJetA: parseFloat(fbo.FuelJetA) || 0,
      buildingMaterials: parseFloat(fbo.BuildingMaterials) || 0,
      supplies: parseFloat(fbo.Supplies) || 0,
      suppliesPerDay: parseFloat(fbo.SuppliesPerDay) || 0,
      // Calcular días restantes de supplies (campo clave para alertas)
      daysOfSupplies: fbo.SuppliesPerDay > 0 
        ? parseFloat(fbo.Supplies) / parseFloat(fbo.SuppliesPerDay)
        : null,
      suppliedDays: parseInt(fbo.SuppliedDays) || 0,
      sellPrice: parseFloat(fbo.SellPrice) || 0,
      fuel100LLGal: parseFloat(fbo.Fuel100LLGal) || 0,
      fuelJetAGal: parseFloat(fbo.FuelJetAGal) || 0,
      price100LLGal: parseFloat(fbo.Price100LLGal) || 0,
      priceJetAGal: parseFloat(fbo.PriceJetAGal) || 0,
      // Ground crew fees: FSE no lo devuelve en este endpoint; se puede calcular aparte si es necesario
      groundCrewFees: 0
    };
  });

  DebugLogger.log('PARSER', `Returning ${result.length} parsed FBOs`, { ICAOs: result.map(f => f.icao).join(', ') });
  
  return result;
}

/**
 * Parsea respuesta de aeronaves (estructura similar, implementar según necesidad)
 */
function parseAircraft(parsed) {
  DebugLogger.log('PARSER', 'parseAircraft() called - not implemented yet');
  return parsed;
}

/**
 * Parsea respuesta de pagos (payments endpoint)
 * Estructura típica: <PaymentItems><Payment>...</Payment></PaymentItems>
 */
function parsePayments(parsed) {
  DebugLogger.log('PARSER', 'parsePayments() called', { rootKeys: Object.keys(parsed || {}) });
  
  // Estructura típica: <PaymentItems><Payment>...</Payment></PaymentItems>
  const paymentItems = parsed?.PaymentItems || parsed?.paymentItems;
  if (!paymentItems) {
    DebugLogger.warn('PARSER', 'No PaymentItems found in response', { availableKeys: Object.keys(parsed || {}) });
    return [];
  }
  
  let payments = paymentItems.Payment || paymentItems.payment;
  if (!payments) {
    DebugLogger.log('PARSER', 'No Payment elements found inside PaymentItems');
    return [];
  }
  if (!Array.isArray(payments)) payments = [payments];
  
  DebugLogger.log('PARSER', `Processing ${payments.length} payment(s)`);
  
  return payments.map(p => ({
    // Mapear campos comunes de payments (ajustar según respuesta real de FSE)
    id: p.PaymentId || p.id,
    date: p.Date || p.date,
    type: p.Type || p.type,
    description: p.Description || p.description,
    amount: parseFloat(p.Amount || p.amount) || 0,
    currency: p.Currency || p.currency || 'USD',
    airportIcao: p.AirportIcao || p.Icao || p.airport,
    aircraftReg: p.AircraftReg || p.registration,
  }));
}

module.exports = { parseFSEXml };
