const jwt = require("jsonwebtoken");

// Lee la clave secreta de la variable de entorno
const SECRET_KEY = process.env.JWT_SECRET;

const loginController = (req, res) => {
  const { password } = req.body;
  //   console.log("password: ", password);
  // Validar contraseña
  if (password === process.env.PASSWORD) {
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
