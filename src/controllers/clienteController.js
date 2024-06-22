const Cliente = require("../models/Cliente");

// Obtener todos los clientes
const getAllClientes = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const clientes = await Cliente.findAll();
    console.log("Response body clientes:", clientes);
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo cliente
const createCliente = async (req, res) => {
  try {
    console.log("Request body:", req.body); // Log the request body to see what data is being sent
    const cliente = await Cliente.create(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    console.error("Error creating cliente:", error); // Log the error details
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un cliente existente
const updateCliente = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Cliente.update(req.body, {
      where: { idcliente: id },
    });
    if (updated !== 0) {
      const updatedCliente = await Cliente.findOne({
        where: { idcliente: id },
      });
      res.status(200).json(updatedCliente);
    } else {
      // throw new Error("Cliente not found");
      res.status(200).json({ message: "No hubo cambios en el Cliente" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllClientes, createCliente, updateCliente };
