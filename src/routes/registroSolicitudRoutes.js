const express = require("express");

module.exports = ({ RegistroSolicitud, Autorizacion }) => {
  const router = express.Router();

  // Importar controladores y pasar los modelos inicializados
  const { getRegistrosSolicitud } =
    require("../controllers/registroSolicitudController")({
      RegistroSolicitud,
      Autorizacion,
    });

  // Ruta para obtener los registros con filtros (usando POST)
  router.post("/", getRegistrosSolicitud);

  return router;
};
