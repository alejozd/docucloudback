const Cliente = require("../models/Cliente");

// Obtener todos los clientes
exports.getAllClientes = async (req, res) => {
  try {
    const clientes = await Cliente.findAll();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo cliente
exports.createCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un cliente existente
exports.updateCliente = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Cliente.update(req.body, {
      where: { idcliente: id },
    });
    if (updated) {
      const updatedCliente = await Cliente.findOne({
        where: { idcliente: id },
      });
      res.status(200).json(updatedCliente);
    } else {
      throw new Error("Cliente not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllClientes };
