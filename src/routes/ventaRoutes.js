const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { Venta } = models;

  // Obtener todas las ventas
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const ventas = await models.Venta.findAll({
        include: [
          {
            model: models.Vendedor,
            as: "vendedor",
            attributes: ["id", "nombre"],
          },
          {
            model: models.ClienteMedio,
            as: "cliente_medio",
            attributes: ["id", "nombre_completo"],
          },
        ],
      });
      res.json(ventas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las ventas." });
    }
  });

  // Crear una nueva venta
  router.post("/", authenticateToken, async (req, res) => {
    const { vendedor_id, cliente_medio_id, fecha_venta, valor_total } =
      req.body;
    try {
      const nuevaVenta = await models.Venta.create({
        vendedor_id,
        cliente_medio_id,
        fecha_venta,
        valor_total,
      });
      res.status(201).json(nuevaVenta);
    } catch (error) {
      res.status(400).json({ error: "Error al crear la venta." });
    }
  });

  return router;
};
