const { Paciente } = require("../models");

const getPacientes = async (req, res) => {
  try {
    const pacientes = await Paciente.findAll({ order: [["id", "ASC"]] });
    return res.status(200).json(pacientes);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener la lista de pacientes",
      error: error.message,
    });
  }
};

module.exports = { getPacientes };
