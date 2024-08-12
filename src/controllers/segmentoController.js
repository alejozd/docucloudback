const Segmento = require("../models/Segmento");

exports.getSegmentos = async (req, res) => {
  try {
    const segmentos = await Segmento.findAll();
    res.json(segmentos);
  } catch (error) {
    console.error("Error al obtener los segmentos:", error);
    res.status(500).json({ message: "Error al obtener los segmentos." });
  }
};
