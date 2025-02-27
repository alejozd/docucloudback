const express = require("express");
const router = express.Router();

// Importar controlador
const claveMediosController = require("../controllers/claveMediosController");

module.exports = (models) => {
  const { SerialERP, ClaveGenerada } = models;

  // Endpoint para generar clave desde serial
  router.post("/generar-clave", (req, res) => {
    claveMediosController.generarClaveDesdeSerial(req, res, {
      SerialERP,
      ClaveGenerada,
    });
  });

  return router;
};
