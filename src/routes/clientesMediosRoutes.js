const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");

module.exports = (models) => {
  const { ClienteMedio } = models;

  // Obtener todos los clientes medios (protegido)
  router.get("/", authenticateToken, async (req, res) => {
    try {
      // const clientes = await ClienteMedio.findAll({
      //   include: [
      //     {
      //       model: models.Vendedor,
      //       as: "vendedor", // Incluye el vendedor asociado
      //       attributes: ["id", "nombre"], // Solo incluye campos relevantes del vendedor
      //     },
      //   ],
      // });
      const clientes = await models.clientesMediosController.getClientesMedios(
        models
      );
      res.json(clientes);
    } catch (error) {
      console.error("Error al obtener los clientes medios:", error.message);
      res.status(500).json({ error: "Error al obtener los clientes medios." });
    }
  });

  // Obtener un cliente medio por ID (protegido)
  router.get("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const cliente = await ClienteMedio.findByPk(id, {
        include: [
          {
            model: models.Vendedor,
            as: "vendedor", // Incluye el vendedor asociado
            attributes: ["id", "nombre"], // Solo incluye campos relevantes del vendedor
          },
        ],
      });
      if (!cliente) {
        return res.status(404).json({ error: "Cliente medio no encontrado." });
      }
      res.json(cliente);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener el cliente medio." });
    }
  });

  // Crear un nuevo cliente medio (protegido)
  router.post("/", authenticateToken, async (req, res) => {
    const {
      nombre_completo,
      email,
      telefono,
      empresa,
      direccion,
      activo,
      vendedor_id,
    } = req.body;
    try {
      const nuevoCliente = await ClienteMedio.create({
        nombre_completo,
        email,
        telefono,
        empresa,
        direccion,
        activo,
        vendedor_id, // Agrega el vendedor_id
      });
      res.status(201).json(nuevoCliente);
    } catch (error) {
      console.error("Error al crear el cliente medio:", error.message);
      if (error.name === "SequelizeValidationError") {
        // Capturar errores de validación específicos
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res
          .status(400)
          .json({ error: "Error de validación", details: validationErrors });
      }
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  // Actualizar un cliente medio (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const {
      nombre_completo,
      email,
      telefono,
      empresa,
      direccion,
      activo,
      vendedor_id,
    } = req.body;
    try {
      const cliente = await ClienteMedio.findByPk(id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente medio no encontrado." });
      }
      await cliente.update({
        nombre_completo,
        email,
        telefono,
        empresa,
        direccion,
        activo,
        vendedor_id, // Actualiza el vendedor_id
      });
      res.json(cliente);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Eliminar un cliente medio (protegido)
  router.delete("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const cliente = await ClienteMedio.findByPk(id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente medio no encontrado." });
      }
      await cliente.destroy();
      res.json({ message: "Cliente medio eliminado correctamente." });
    } catch (error) {
      res.status(500).json({ error: "Error al eliminar el cliente medio." });
    }
  });

  return router;
};
