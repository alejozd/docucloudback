const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const clientesMediosController = require("../controllers/clientesMediosController");

module.exports = (models) => {
  // Obtener todos los clientes medios
  router.get("/", authenticateToken, async (req, res) => {
    try {
      const clientes = await clientesMediosController.getClientesMedios(models);
      res.json(clientes);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Obtener un cliente medio por ID
  router.get("/:id", authenticateToken, async (req, res) => {
    try {
      const cliente = await clientesMediosController.getClienteMedioById(
        models,
        req.params.id
      );
      res.json(cliente);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  // Crear un nuevo cliente medio
  router.post("/", authenticateToken, async (req, res) => {
    try {
      const nuevoCliente = await clientesMediosController.createClienteMedio(
        models,
        req.body
      );
      res.status(201).json(nuevoCliente);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Actualizar un cliente medio
  router.put("/:id", authenticateToken, async (req, res) => {
    try {
      const clienteActualizado =
        await clientesMediosController.updateClienteMedio(
          models,
          req.params.id,
          req.body
        );
      res.json(clienteActualizado);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Eliminar un cliente medio
  router.delete("/:id", authenticateToken, async (req, res) => {
    try {
      const mensaje = await clientesMediosController.deleteClienteMedio(
        models,
        req.params.id
      );
      res.json(mensaje);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
