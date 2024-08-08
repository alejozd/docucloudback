const express = require("express");
const {
  getAllAsociaciones,
  createAsociacion,
  deleteAsociacion,
  getContactosByCliente,
} = require("../controllers/asociarClienteContactoController");

const router = express.Router();

// Obtener todas las asociaciones
router.get("/asociaciones", getAllAsociaciones);

// Crear una nueva asociación
router.post("/asociaciones", createAsociacion);

// Eliminar una asociación
router.delete("/asociaciones/:id", deleteAsociacion);

// Obtener contactos asociados a un cliente
router.get("/clientes/:clienteId/contactos", getContactosByCliente);

module.exports = router;
