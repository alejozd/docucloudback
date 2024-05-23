const express = require("express");
const {
  getAllClientes,
  createCliente,
} = require("../controllers/clienteController");

const router = express.Router();

// Ruta para la URL raíz
router.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Ruta para obtener todos los clientes
router.get("/clientes", getAllClientes);

// Ruta para crear un nuevo cliente
router.post("/clientes", createCliente);

module.exports = router;
