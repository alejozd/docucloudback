const express = require("express");
const { getAllClientes } = require("../controllers/clienteController");

const router = express.Router();

// Ruta para la URL raíz
router.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

router.get("/clientes", getAllClientes);

module.exports = router;
