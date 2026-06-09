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

  // LOGS PARA DEBUG
  console.log('[apiKeyAuth] === DEBUG ===');
  console.log('[apiKeyAuth] Headers disponibles:', Object.keys(req.headers).filter(h => h.includes('key') || h.includes('auth')));
  console.log('[apiKeyAuth] Query params:', req.query);
  console.log('[apiKeyAuth] ===============');

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
      console.log('[apiKeyAuth] Formato incorrecto del header Authorization');
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

  // Log de depuración
  console.log('[apiKeyAuth] API Key recibida:', providedApiKey ? providedApiKey.substring(0, 10) + '...' : 'NINGUNA');
  console.log('[apiKeyAuth] API Key esperada:', expectedApiKey ? expectedApiKey.substring(0, 10) + '...' : 'NO CONFIGURADA');
  console.log('[apiKeyAuth] Fuente de API Key:', apiKeySource);

  // Verificar que se proporcionó una API Key
  if (!providedApiKey) {
    console.log('[apiKeyAuth] Acceso denegado: No se proporcionó API Key');
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. API Key requerida. Usa header x-api-key, Authorization: Bearer, o query parameter ?api_key=xxx' 
    });
  }

  // Comparar la API Key proporcionada con la esperada
  if (providedApiKey !== expectedApiKey) {
    console.log('[apiKeyAuth] Acceso denegado: API Key no coincide');
    return res.status(401).json({ 
      success: false, 
      message: 'No autorizado. API Key inválida' 
    });
  }

  console.log('[apiKeyAuth] Acceso permitido');
  next();
};

module.exports = apiKeyAuth;
