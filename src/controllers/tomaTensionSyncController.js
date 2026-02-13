const { TomaTensionSync } = require("../models");

const syncTomaTension = async (req, res) => {
  try {
    const { paciente_id, sistole, diastole, ritmoCardiaco, fecha_registro } =
      req.body;

    if (
      paciente_id === undefined ||
      sistole === undefined ||
      diastole === undefined ||
      ritmoCardiaco === undefined ||
      !fecha_registro
    ) {
      return res.status(400).json({
        message:
          "Los campos paciente_id, sistole, diastole, ritmoCardiaco y fecha_registro son obligatorios",
      });
    }

    const registro = await TomaTensionSync.create({
      paciente_id,
      sistole,
      diastole,
      ritmoCardiaco,
      fecha_registro,
    });

    return res.status(201).json(registro);
  } catch (error) {
    return res.status(500).json({
      message: "Error al sincronizar toma de tensión",
      error: error.message,
    });
  }
};

module.exports = { syncTomaTension };
