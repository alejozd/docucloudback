const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { Vendedor } = models;

  // Obtener todos los vendedores (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const vendedores = await Vendedor.findAll();
      res.json(vendedores);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los vendedores." });
    }
  });

  // Crear un nuevo vendedor (protegido)
  router.post("/", authenticateToken, async (req, res) => {
    const { nombre, telefono } = req.body;
    try {
      if (!nombre) {
        return res
          .status(400)
          .json({ error: "El campo 'nombre' es obligatorio." });
      }
      const nuevoVendedor = await Vendedor.create({
        nombre,
        telefono,
      });
      res.status(201).json(nuevoVendedor);
    } catch (error) {
      res.status(400).json({ error: "Error al crear el vendedor." });
    }
  });

  // Actualizar un vendedor por ID (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    try {
      const vendedor = await Vendedor.findByPk(id);
      if (!vendedor) {
        return res.status(404).json({ error: "Vendedor no encontrado." });
      }
      await vendedor.update({
        nombre,
        telefono,
      });
      res.json(vendedor);
    } catch (error) {
      res.status(400).json({ error: "Error al actualizar el vendedor." });
    }
  });

  // Eliminar un vendedor por ID (protegido)
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const vendedor = await Vendedor.findByPk(id);
      if (!vendedor) {
        return res.status(404).json({ error: "Vendedor no encontrado." });
      }
      await vendedor.destroy();
      res.json({ message: "Vendedor eliminado correctamente." });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar el vendedor." });
    }
  });

  return router;
};
