const Cliente = require("../models/Cliente");

const getAllClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll();
    res.json(clientes);
  } catch (error) {
    console.error("Error al obtener clientes:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllClientes };
