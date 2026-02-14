const express = require("express");
const {
  getAllClientes,
  createCliente,
  updateCliente,
} = require("../controllers/clienteController");

const router = express.Router();

router.route("/clientes").get(getAllClientes).post(createCliente);
router.put("/clientes/:id", updateCliente);

module.exports = router;
