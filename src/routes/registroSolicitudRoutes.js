const express = require("express");
const router = express.Router();
const {
  getRegistrosSolicitud,
} = require("../controllers/registroSolicitudController");

// Ruta para obtener los registros con filtros (usando POST)
router.post("/registro-solicitudes", getRegistrosSolicitud);

module.exports = router;
