const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.JWT_SECRET || "tu_clave_secreta";

const authenticateToken = (req, res, next) => {
  //   console.log("Token recibido en el servidor: ", req.headers["authorization"]);
  const tokenHeader = req.headers["authorization"];

  if (!tokenHeader) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  // Extraer el token real (sin el "Bearer ")
  const token = tokenHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Formato de token incorrecto" });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // Puedes acceder al payload del token si lo necesitas
    // console.log("Token decodificado correctamente: ", decoded);
    next();
  } catch (error) {
    console.error("Error al verificar el token:", error.message);
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = {
  authenticateToken,
};
