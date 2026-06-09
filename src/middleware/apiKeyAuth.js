/**
 * Middleware de autenticación por API Key
 * Valida que la petición incluya una API Key válida en headers o query parameters
 * 
 * Formatos soportados:
 * - Header: x-api-key: <api-key>
 * - Header: Authorization: Bearer <api-key>
 * - Query Parameter: ?api_key=<api-key> (para etiquetas <audio> de HTML5)
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

  // Buscar la API Key en múltiples fuentes (prioridad: header x-api-key > authorization > query param)
  const apiKeyFromHeader = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];
  const apiKeyFromQuery = req.query.api_key;
  
  let providedApiKey = null;
  let apiKeySource = 'none';

  // Prioridad 1: x-api-key header
  if (apiKeyFromHeader) {
    providedApiKey = apiKeyFromHeader.trim();
    apiKeySource = 'x-api-key header';
  } 
  // Prioridad 2: Authorization: Bearer <api-key>
  else if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      providedApiKey = parts[1].trim();
      apiKeySource = 'authorization bearer header';
    } else {
      console.warn('[apiKeyAuth] Acceso denegado: Formato de autorización incorrecto');
      return res.status(401).json({
        success: false,
        error: 'Formato de autorización incorrecto. Use: Authorization: Bearer <api-key>'
      });
    }
  }
  // Prioridad 3: query parameter api_key (para etiquetas <audio> de HTML5)
  else if (apiKeyFromQuery) {
    providedApiKey = apiKeyFromQuery.trim();
    apiKeySource = 'query parameter';
  }

  // Verificar que se proporcionó una API Key
  if (!providedApiKey) {
    console.warn('[apiKeyAuth] Acceso denegado');
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. API Key requerida. Usa header x-api-key, Authorization: Bearer, o query parameter ?api_key=xxx' 
    });
  }

  // Comparar la API Key proporcionada con la esperada
  if (providedApiKey !== expectedApiKey) {
    console.warn('[apiKeyAuth] Acceso denegado');
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. API Key inválida' 
    });
  }

  next();
};

module.exports = apiKeyAuth;
