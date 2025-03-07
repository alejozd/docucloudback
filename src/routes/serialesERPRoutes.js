const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { SerialERP, serialesERPController } = models;

  // Obtener todos los seriales ERP (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const seriales = await serialesERPController.getSerialesERP(models);
      res.json(seriales);
    } catch (error) {
      console.error("Error detallado:", error.message);
      res.status(500).json({ error: "Error al obtener los seriales ERP." });
    }
  });

  // Obtener un serial ERP por ID o serial_erp (protegido)
  router.get("/:identifier", authenticateToken, async (req, res) => {
    const { identifier } = req.params;
    try {
      const serial = await serialesERPController.getSerialERPByIdOrSerial(
        models,
        identifier
      );
      res.json(serial);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // Crear un nuevo serial ERP (protegido)
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevoSerial = await serialesERPController.createSerialERP(
        models,
        req.body
      );
      res.status(201).json(nuevoSerial);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Actualizar un serial ERP (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const serial = await serialesERPController.updateSerialERP(
        models,
        id,
        req.body
      );
      res.json(serial);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Eliminar un serial ERP (protegido)
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const response = await serialesERPController.deleteSerialERP(models, id);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
