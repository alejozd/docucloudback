const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const ventaController = require("../controllers/ventaController");

module.exports = (models) => {
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const ventas = await ventaController.getVentas(models);
      res.json(ventas);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las ventas." });
    }
  });

  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevaVenta = await ventaController.createVenta(models, req.body);
      res.status(201).json(nuevaVenta);
    } catch (error) {
      res.status(400).json({ error: "Error al crear la venta." });
    }
  });

  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const ventaActualizada = await ventaController.updateVenta(
        models,
        id,
        req.body
      );
      res.json(ventaActualizada);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const resultado = await ventaController.deleteVenta(models, id);
      res.json(resultado);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  return router;
};
