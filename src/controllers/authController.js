const jwt = require("jsonwebtoken");

// Clave secreta para firmar los tokens JWT
const SECRET_KEY = process.env.JWT_SECRET || "tu_clave_secreta";

const loginController = (req, res) => {
  const { password } = req.body;
  //   console.log("password: ", password);
  // Validar contraseña
  if (password === "Alejo123*-+") {
    // Aquí comparas la contraseña
    const token = jwt.sign({ user: "user" }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token });
  } else {
    res.status(401).json({ error: "Contraseña incorrecta" });
  }
};

module.exports = {
  loginController,
};
