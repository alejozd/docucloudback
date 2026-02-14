const { AsociarClienteContacto, Cliente, Contacto } = require("../models");

const handleServerError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({ error: error.message });
};

// Obtener todas las asociaciones
const getAllAsociaciones = async (_req, res) => {
  try {
    const asociaciones = await AsociarClienteContacto.findAll();
    return res.json(asociaciones);
  } catch (error) {
    return handleServerError(res, error, "getAllAsociaciones");
  }
};

// Crear una nueva asociación
const createAsociacion = async (req, res) => {
  try {
    const asociacion = await AsociarClienteContacto.create(req.body);
    return res.status(201).json(asociacion);
  } catch (error) {
    return handleServerError(res, error, "createAsociacion");
  }
};

// Eliminar una asociación
const deleteAsociacion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AsociarClienteContacto.destroy({
      where: { idasoclicont: id },
    });

    if (deleted) {
      return res.status(204).json({ message: "Asociación eliminada correctamente" });
    }

    return res.status(404).json({ message: "Asociación no encontrada" });
  } catch (error) {
    return handleServerError(res, error, "deleteAsociacion");
  }
};

// Obtener contactos asociados a un cliente
const getContactosByCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;

    const cliente = await Cliente.findByPk(clienteId, {
      include: {
        model: Contacto,
        through: {
          attributes: [],
        },
      },
    });

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado." });
    }

    const contactosAsociados = await cliente.getContactos();
    return res.json(contactosAsociados);
  } catch (error) {
    return handleServerError(res, error, "getContactosByCliente");
  }
};

// Asociar contactos a un cliente
const asociarContactos = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { contactos } = req.body;

    await AsociarClienteContacto.destroy({ where: { idcliente: clienteId } });

    const asociaciones = contactos.map((idcontacto) => ({
      idcliente: clienteId,
      idcontacto,
    }));

    await AsociarClienteContacto.bulkCreate(asociaciones);

    return res.status(201).json({ message: "Asociaciones guardadas correctamente." });
  } catch (error) {
    return handleServerError(res, error, "asociarContactos");
  }
};

module.exports = {
  getAllAsociaciones,
  createAsociacion,
  deleteAsociacion,
  getContactosByCliente,
  asociarContactos,
};
