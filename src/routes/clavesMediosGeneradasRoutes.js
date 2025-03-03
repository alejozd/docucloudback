const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { ClaveGenerada } = models;

  // Obtener todas las claves generadas (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const claves = await ClaveGenerada.findAll();
      res.json(claves);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las claves generadas." });
    }
  });

  return router;
};
