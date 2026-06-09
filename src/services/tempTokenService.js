const crypto = require('crypto');

// Almacenamiento en memoria de tokens temporales
// Estructura: { token: { filename, createdAt, expiresAt, used } }
const tempTokens = new Map();

// Limpiar tokens expirados cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tempTokens.entries()) {
    if (data.expiresAt < now) {
      tempTokens.delete(token);
    }
  }
}, 10 * 60 * 1000);

/**
 * Genera un token temporal para acceder a un archivo específico
 * @param {string} filename - Nombre del archivo
 * @param {number} durationMinutes - Duración del token en minutos (default: 30)
 * @returns {string} Token generado
 */
function generateToken(filename, durationMinutes = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  
  tempTokens.set(token, {
    filename: filename,
    createdAt: now,
    expiresAt: now + (durationMinutes * 60 * 1000),
    used: false
  });
  
  return token;
}

/**
 * Valida y consume un token temporal
 * @param {string} token - Token a validar
 * @returns {object|null} Datos del token si es válido, null si no
 */
function validateToken(token) {
  const data = tempTokens.get(token);
  
  if (!data) {
    return null;
  }
  
  if (data.expiresAt < Date.now()) {
    tempTokens.delete(token);
    return null;
  }
  
  if (data.used) {
    return null;
  }
  
  // Marcar como usado (pero no eliminar, para permitir retries del navegador)
  // En su lugar, permitimos múltiples usos dentro de la ventana de tiempo
  // data.used = true;
  
  return data;
}

/**
 * Limpia todos los tokens (útil para testing)
 */
function clearAllTokens() {
  tempTokens.clear();
}

module.exports = {
  generateToken,
  validateToken,
  clearAllTokens
};
