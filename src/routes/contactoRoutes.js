const express = require("express");
const {
  getAllContactos,
  createContacto,
  updateContacto,
} = require("../controllers/contactoController");

const router = express.Router();

// Ruta para la URL raíz
router.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Ruta para obtener todos los clientes
router.get("/contactos", getAllContactos);

// Ruta para crear un nuevo cliente
router.post("/contactos", createContacto);

// Ruta para actualizar un cliente existente
router.put("/contactos/:id", updateContacto);

module.exports = router;
