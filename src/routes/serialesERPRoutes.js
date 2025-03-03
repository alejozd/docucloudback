const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { SerialERP } = models;

  // Obtener todos los seriales ERP (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const seriales = await SerialERP.findAll();
      res.json(seriales);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los seriales ERP." });
    }
  });

  // Obtener un serial ERP por ID o por serial_erp (protegido)
  router.get("/:identifier", authenticateToken, async (req, res) => {
    const { identifier } = req.params;

    try {
      let serial;

      // Intentar buscar por ID
      if (!isNaN(identifier)) {
        serial = await SerialERP.findByPk(identifier);
      }

      // Si no se encuentra por ID, intentar buscar por serial_erp
      if (!serial) {
        serial = await SerialERP.findOne({
          where: { serial_erp: identifier },
        });
      }

      if (!serial) {
        return res.status(404).json({ error: "Serial ERP no encontrado." });
      }

      res.json(serial);
    } catch (error) {
      console.error("Error al obtener el serial ERP:", error.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  // Crear un nuevo serial ERP (protegido)
  router.post("/", authenticateToken, async (req, res) => {
    const { serial_erp, ano_medios, cliente_id, activo } = req.body;

    try {
      const nuevoSerial = await SerialERP.create({
        serial_erp,
        ano_medios,
        cliente_id,
        activo,
      });
      res.status(201).json(nuevoSerial);
    } catch (error) {
      res.status(400).json({ error: "Error al crear el serial ERP." });
    }
  });

  // Actualizar un serial ERP (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { serial_erp, ano_medios, cliente_id, activo } = req.body;

    try {
      const serial = await SerialERP.findByPk(id);
      if (!serial) {
        return res.status(404).json({ error: "Serial ERP no encontrado." });
      }

      await serial.update({
        serial_erp,
        ano_medios,
        cliente_id,
        activo,
      });

      res.json(serial);
    } catch (error) {
      res.status(400).json({ error: "Error al actualizar el serial ERP." });
    }
  });

  // Eliminar un serial ERP (protegido)
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const serial = await SerialERP.findByPk(id);
      if (!serial) {
        return res.status(404).json({ error: "Serial ERP no encontrado." });
      }

      await serial.destroy();
      res.json({ message: "Serial ERP eliminado correctamente." });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar el serial ERP." });
    }
  });

  return router;
};
