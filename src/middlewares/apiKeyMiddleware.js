/**
 * Middleware para validar API KEY en header
 * Espera: Authorization: Bearer <API_KEY>
 */
const validateApiKey = (req, res, next) => {
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    console.error('API_KEY no configurada en .env');
    return res.status(500).json({ error: 'Configuración de servidor inválida' });
  }

  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'no_autorizado' });
  }

  // Extraer el token (sin el "Bearer ")
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de autorización incorrecto' });
  }

  const token = parts[1];

  if (token !== apiKey) {
    return res.status(401).json({ error: 'no_autorizado' });
  }

  next();
};

module.exports = {
  validateApiKey,
};
