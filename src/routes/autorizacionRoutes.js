const express = require("express");

module.exports = ({ Autorizacion, RegistroSolicitud }) => {
  const router = express.Router();

  // Importar controladores y pasar los modelos inicializados
  const {
    getEstadoAutorizacion,
    incrementarIntentosEnvio,
    cambiarEstadoAutorizacion,
    obtenerListadoAutorizaciones,
  } = require("../controllers/autorizacionController")({
    Autorizacion,
    RegistroSolicitud,
  });

  // Ruta para obtener el estado de autorización por ID
  router.get("/autorizacion/estado/:id", getEstadoAutorizacion);

  // Ruta para incrementar los intentos de envío
  router.post(
    "/autorizacion/incrementar-intentos/:id",
    incrementarIntentosEnvio
  );

  // Ruta para cambiar el estado de autorización
  router.put("/autorizacion/cambiar-estado/:id", cambiarEstadoAutorizacion);

  // Ruta para obtener el listado de autorizaciones
  router.get("/autorizacion/listado", obtenerListadoAutorizaciones);

  return router;
};
