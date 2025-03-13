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

  // Actualizar una venta existente
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const datos = req.body;

    try {
      const venta = await Venta.findByPk(id);
      if (!venta) {
        return res.status(404).json({ error: "Venta no encontrada." });
      }

      await venta.update(datos);
      res.json(venta);
    } catch (error) {
      console.error("Error al actualizar la venta:", error.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  // Eliminar una venta existente
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const venta = await Venta.findByPk(id);
      if (!venta) {
        return res.status(404).json({ error: "Venta no encontrada." });
      }

      await venta.destroy(); // Elimina el registro de la base de datos
      res.json({ message: "Venta eliminada correctamente." });
    } catch (error) {
      console.error("Error al eliminar la venta:", error.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  return router;
};
