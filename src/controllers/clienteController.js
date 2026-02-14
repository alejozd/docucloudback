const Cliente = require("../models/Cliente");

const handleServerError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({ error: error.message });
};

// Obtener todos los clientes
const getAllClientes = async (_req, res) => {
  try {
    const clientes = await Cliente.findAll();
    return res.json(clientes);
  } catch (error) {
    return handleServerError(res, error, "getAllClientes");
  }
};

// Crear un nuevo cliente
const createCliente = async (req, res) => {
  try {
    const cliente = await Cliente.create(req.body);
    return res.status(201).json(cliente);
  } catch (error) {
    return handleServerError(res, error, "createCliente");
  }
};

// Actualizar un cliente existente
const updateCliente = async (req, res) => {
  try {
    const { id } = req.params;

    const [updated] = await Cliente.update(req.body, {
      where: { idcliente: id },
    });

    if (updated === 0) {
      return res.status(200).json({ message: "No hubo cambios en el Cliente" });
    }

    const updatedCliente = await Cliente.findOne({
      where: { idcliente: id },
    });

    return res.status(200).json(updatedCliente);
  } catch (error) {
    return handleServerError(res, error, "updateCliente");
  }
};

module.exports = { getAllClientes, createCliente, updateCliente };
