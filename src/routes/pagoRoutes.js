const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

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
    const { venta_id, monto_pagado, fecha_pago, metodo_pago } = req.body;
    try {
      const nuevoPago = await models.Pago.create({
        venta_id,
        monto_pagado,
        fecha_pago,
        metodo_pago,
      });
      res.status(201).json(nuevoPago);
    } catch (error) {
      res.status(400).json({ error: "Error al crear el pago." });
    }
  });

  // Editar un pago existente
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { venta_id, monto_pagado, fecha_pago, metodo_pago } = req.body;

    try {
      // Buscar el pago por su ID
      const pago = await models.Pago.findByPk(id);
      if (!pago) {
        return res.status(404).json({ error: "Pago no encontrado." });
      }

      // Actualizar el pago con los datos recibidos
      await pago.update({ venta_id, monto_pagado, fecha_pago, metodo_pago });

      res.json(pago);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Error al actualizar el pago." });
    }
  });

  return router;
};
