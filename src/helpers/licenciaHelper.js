const crypto = require('crypto');

/**
 * Genera un hash SHA256 para uso interno
 * @param {string} data - Datos a hashear
 * @returns {string} - Hash en hexadecimal
 */
const generarHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Calcula los días restantes entre dos fechas
 * @param {Date} fechaExpiracion - Fecha de expiración
 * @returns {number} - Días restantes (puede ser negativo si ya expiró)
 */
const calcularDiasRestantes = (fechaExpiracion) => {
  const ahora = new Date();
  const expiracion = new Date(fechaExpiracion);
  const diferenciaMs = expiracion - ahora;
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  return diasRestantes;
};

/**
 * Genera firma digital para licencia offline
 * @param {string} nit - NIT del cliente
 * @param {string} instalacion - Hash de instalación
 * @param {string} expira - Fecha de expiración
 * @param {string} secretKey - Clave secreta desde .env
 * @returns {string} - Firma SHA256
 */
const generarFirmaOffline = (nit, instalacion, expira, secretKey) => {
  const datosParaFirmar = `${nit}${instalacion}${expira}${secretKey}`;
  return generarHash(datosParaFirmar);
};

module.exports = {
  generarHash,
  calcularDiasRestantes,
  generarFirmaOffline,
};
