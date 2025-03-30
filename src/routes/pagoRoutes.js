const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const pagoController = require("../controllers/pagoController");
const models = require("../models");

module.exports = (models) => {
  const { Pago } = models;

  // Obtener todos los pagos
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const pagos = await models.Pago.findAll({
        include: [
          {
            model: models.Venta,
            as: "venta",
            attributes: ["id", "valor_total"],
          },
        ],
      });
      res.json(pagos);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los pagos." });
    }
  });

  // Crear un nuevo pago
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevoPago = await pagoController.createPago(models, req.body);
      res.status(201).json(nuevoPago);
    } catch (error) {
      res.status(400).json({ error: "Error al crear el pago." });
    }
  });

  // Editar un pago existente
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const datos = req.body;
    try {
      // Llamamos a la función en el controlador
      const pagoActualizado = await pagoController.updatePago(
        models,
        id,
        datos
      );
      res.json(pagoActualizado);
    } catch (error) {
      console.error(
        "❌ Error en la ruta de actualización de pago:",
        error.message
      );
      res.status(400).json({ error: error.message });
    }
  });

  // Eliminar un pago existente
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
      const resultado = await pagoController.deletePago(models, id);
      res.json(resultado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
};
