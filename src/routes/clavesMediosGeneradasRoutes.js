const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { ClaveGenerada, clavesMediosGeneradasController } = models;

  // Obtener todas las claves generadas (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const claves = await clavesMediosGeneradasController.getClavesGeneradas(
        models
      );
      res.json(claves);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
