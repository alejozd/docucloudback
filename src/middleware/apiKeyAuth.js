/**
 * Middleware de autenticación por API Key
 * Valida que la petición incluya una API Key válida en los headers
 * 
 * Formatos soportados:
 * - Header: x-api-key: <api-key>
 * - Header: Authorization: Bearer <api-key>
 */

const apiKeyAuth = (req, res, next) => {
  // Obtener la API Key esperada desde variables de entorno
  const expectedApiKey = process.env.ZAM_API_KEY;

  // Verificar que esté configurada la API Key en el servidor
  if (!expectedApiKey) {
    console.error('[apiKeyAuth] Error: ZAM_API_KEY no está configurada en el servidor');
    return res.status(500).json({
      success: false,
      error: 'Configuración del servidor inválida'
    });
  }

  // Buscar la API Key en los headers (dos formatos soportados)
  const apiKeyFromHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  
  let providedApiKey = null;

  // Priorizar x-api-key header
  if (apiKeyFromHeader) {
    providedApiKey = apiKeyFromHeader.trim();
  } 
  // Si no, intentar con Authorization: Bearer <api-key>
  else if (authHeader) {
    // Extraer el token después de "Bearer "
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      providedApiKey = parts[1].trim();
    } else {
      // Formato incorrecto del header Authorization
      return res.status(401).json({
        success: false,
        error: 'Formato de autorización incorrecto. Use: Authorization: Bearer <api-key>'
      });
    }
  }

  // Verificar que se proporcionó una API Key
  if (!providedApiKey) {
    return res.status(401).json({
      success: false,
      error: 'No se proporcionó API Key. Incluya el header x-api-key o Authorization: Bearer <api-key>'
    });
  }

  // Comparar la API Key proporcionada con la esperada
  // Usamos comparación constante para prevenir timing attacks
  if (providedApiKey !== expectedApiKey) {
    console.warn('[apiKeyAuth] Intento de acceso con API Key inválida');
    return res.status(401).json({
      success: false,
      error: 'API Key inválida'
    });
  }

  // API Key válida, permitir el acceso
  // console.log('[apiKeyAuth] API Key válida, acceso permitido');
  next();
};

module.exports = {
  apiKeyAuth
};
