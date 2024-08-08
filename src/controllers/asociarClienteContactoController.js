const AsociarClienteContacto = require("../models/AsociarClienteContacto");
const Cliente = require("../models/Cliente");
const Contacto = require("../models/Contacto");

// Obtener todas las asociaciones
const getAllAsociaciones = async (req, res) => {
  try {
    const asociaciones = await AsociarClienteContacto.findAll();
    res.json(asociaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear una nueva asociación
const createAsociacion = async (req, res) => {
  try {
    const asociacion = await AsociarClienteContacto.create(req.body);
    res.status(201).json(asociacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Eliminar una asociación
const deleteAsociacion = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await AsociarClienteContacto.destroy({
      where: { idasoclicont: id },
    });
    if (deleted) {
      res.status(204).json({ message: "Asociación eliminada correctamente" });
    } else {
      res.status(404).json({ message: "Asociación no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener contactos asociados a un cliente
const getContactosByCliente = async (req, res) => {
  try {
    const clienteId = req.params.clienteId;
    const cliente = await Cliente.findByPk(clienteId, {
      include: {
        model: Contacto,
        through: {
          attributes: [], // No incluir atributos de la tabla intermedia
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente.Contactos); // Retornar solo los contactos
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    res.status(500).json({ message: "Error al obtener contactos" });
  }
};

module.exports = {
  getAllAsociaciones,
  createAsociacion,
  deleteAsociacion,
  getContactosByCliente,
};
