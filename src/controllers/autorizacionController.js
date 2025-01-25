const Autorizacion = require("../models/Autorizacion");

// Función para obtener el estado de autorización por ID
const getEstadoAutorizacion = async (req, res) => {
  const { id } = req.params; // Obtener el ID de la URL

  try {
    const autorizacion = await Autorizacion.findByPk(id); // Buscar por ID en la tabla "autorizacion"

    if (!autorizacion) {
      return res
        .status(404)
        .json({ error: "No se encontró el registro de autorización" });
    }

    // Responder con el estado de autorización
    res.json({ estado: autorizacion.estado });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getEstadoAutorizacion };
