// routes/clientesMediosRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { ClienteMedio } = models;

  // Obtener todos los clientes medios (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const clientes = await models.clientesMediosController.getClientesMedios(
        models
      );
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obtener un cliente medio por ID (protegido)
  router.get("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const cliente = await models.clientesMediosController.getClienteMedioById(
        models,
        id
      );
      res.json(cliente);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // Crear un nuevo cliente medio (protegido)
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevoCliente =
        await models.clientesMediosController.createClienteMedio(
          models,
          req.body
        );
      res.status(201).json(nuevoCliente);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Actualizar un cliente medio (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const cliente = await models.clientesMediosController.updateClienteMedio(
        models,
        id,
        req.body
      );
      res.json(cliente);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Eliminar un cliente medio (protegido)
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const response = await models.clientesMediosController.deleteClienteMedio(
        models,
        id
      );
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
