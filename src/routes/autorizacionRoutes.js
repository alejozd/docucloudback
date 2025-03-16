const express = require("express");
const {
  getEstadoAutorizacion,
  incrementarIntentosEnvio, // Importar la nueva función
  cambiarEstadoAutorizacion,
  obtenerListadoAutorizaciones,
} = require("../controllers/autorizacionController");

const router = express.Router();

// Ruta para obtener el estado de autorización por ID
router.get("/autorizacion/estado/:id", getEstadoAutorizacion);

// Nueva ruta para incrementar los intentos de envío
router.post("/autorizacion/incrementar-intentos/:id", incrementarIntentosEnvio);

// Nueva ruta para cambiar el estado de autorización
router.put("/autorizacion/cambiar-estado/:id", cambiarEstadoAutorizacion);

// Nueva ruta para obtener el listado de autorizaciones
router.get("/autorizacion/listado", obtenerListadoAutorizaciones);

module.exports = router;
