const AsociarClienteContacto = require("../models/AsociarClienteContacto");

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

module.exports = { getAllAsociaciones, createAsociacion, deleteAsociacion };
