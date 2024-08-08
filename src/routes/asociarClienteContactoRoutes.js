const express = require("express");
const {
  getAllAsociaciones,
  createAsociacion,
  deleteAsociacion,
} = require("../controllers/asociarClienteContactoController");

const router = express.Router();

// Obtener todas las asociaciones
router.get("/asociaciones", getAllAsociaciones);

// Crear una nueva asociación
router.post("/asociaciones", createAsociacion);

// Eliminar una asociación
router.delete("/asociaciones/:id", deleteAsociacion);

module.exports = router;
