const crypto = require("crypto");

const timingSafeEqualStrings = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// Protege endpoints con una API key compartida (header x-api-key) en vez de
// JWT de usuario, pensado para clientes sin flujo de login (p. ej. la app
// móvil de TomaTension). Si TOMA_TENSION_API_KEY no está configurada, deja
// pasar la solicitud pero advierte, para no romper despliegues existentes
// hasta que el operador configure la variable y actualice el cliente.
const authenticateApiKey = (req, res, next) => {
  const expectedKey = process.env.TOMA_TENSION_API_KEY;

  if (!expectedKey) {
    console.warn(
      "TOMA_TENSION_API_KEY no está configurada: este endpoint está sin proteger."
    );
    return next();
  }

  const providedKey = req.headers["x-api-key"];

  if (!providedKey || !timingSafeEqualStrings(providedKey, expectedKey)) {
    return res.status(401).json({ error: "API key inválida o no proporcionada" });
  }

  next();
};

module.exports = { authenticateApiKey };
