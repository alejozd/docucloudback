const express = require("express");
const {
  getEstadoAutorizacion,
} = require("../controllers/autorizacionController");

const router = express.Router();

// Ruta para obtener el estado de autorización por ID
router.get("/autorizacion/estado/:id", getEstadoAutorizacion);

module.exports = router;
