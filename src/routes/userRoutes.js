const express = require("express");
const { getAllClientes } = require("../controllers/clienteController");

const router = express.Router();

router.get("/clientes", getAllClientes);

module.exports = router;
