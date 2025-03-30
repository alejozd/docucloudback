const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const vendedorController = require("../controllers/vendedorController");

module.exports = (models) => {
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const vendedores = await vendedorController.obtenerVendedores(models);
      res.json(vendedores);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/estadisticas", authenticateToken, async (req, res) => {
    try {
      const estadisticas = await vendedorController.obtenerEstadisticas(
        models,
        req.body
      );
      res.json(estadisticas);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id", authenticateToken, async (req, res) => {
    try {
      const vendedor = await vendedorController.obtenerVendedorPorId(
        models,
        req.params.id
      );
      res.json(vendedor);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevoVendedor = await vendedorController.crearVendedor(
        models,
        req.body
      );
      res.status(201).json(nuevoVendedor);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.put("/:id", authenticateToken, async (req, res) => {
    try {
      const vendedorActualizado = await vendedorController.actualizarVendedor(
        models,
        req.params.id,
        req.body
      );
      res.json(vendedorActualizado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      const resultado = await vendedorController.eliminarVendedor(
        models,
        req.params.id
      );
      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get("/:id/cartera", authenticateToken, async (req, res) => {
    try {
      const detalleCartera = await vendedorController.obtenerDetalleCartera(
        models,
        req.params.id
      );
      res.json(detalleCartera);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
