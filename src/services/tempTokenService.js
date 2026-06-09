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
  console.log(`[tempTokenService] Tokens activos: ${tempTokens.size}`);
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
  
  console.log(`[tempTokenService] Token generado para: ${filename}, expira en ${durationMinutes}min`);
  
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
    console.log(`[tempTokenService] Token no encontrado: ${token?.substring(0, 10)}...`);
    return null;
  }
  
  if (data.expiresAt < Date.now()) {
    console.log(`[tempTokenService] Token expirado: ${token.substring(0, 10)}...`);
    tempTokens.delete(token);
    return null;
  }
  
  if (data.used) {
    console.log(`[tempTokenService] Token ya usado: ${token.substring(0, 10)}...`);
    return null;
  }
  
  // Marcar como usado (pero no eliminar, para permitir retries del navegador)
  // En su lugar, permitimos múltiples usos dentro de la ventana de tiempo
  // data.used = true;
  
  console.log(`[tempTokenService] Token válido para: ${data.filename}`);
  return data;
}

/**
 * Limpia todos los tokens (útil para testing)
 */
function clearAllTokens() {
  tempTokens.clear();
  console.log('[tempTokenService] Todos los tokens eliminados');
}

module.exports = {
  generateToken,
  validateToken,
  clearAllTokens
};
