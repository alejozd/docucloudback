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
    const { nombre, telefono, activo } = req.body;
    try {
      if (!nombre) {
        return res
          .status(400)
          .json({ error: "El campo 'nombre' es obligatorio." });
      }
      const nuevoVendedor = await Vendedor.create({
        nombre,
        telefono,
        activo,
      });
      res.status(201).json(nuevoVendedor);
    } catch (error) {
      res.status(400).json({ error: "Error al crear el vendedor." });
    }
  });

  // Actualizar un vendedor por ID (protegido)
  router.put("/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono, activo } = req.body;
    try {
      const vendedor = await Vendedor.findByPk(id);
      if (!vendedor) {
        return res.status(404).json({ error: "Vendedor no encontrado." });
      }
      await vendedor.update({
        nombre,
        telefono,
        activo,
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

  // Obtener el detalle de cartera de un vendedor (protegido)
  router.get("/:id/cartera", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { Venta, Pago } = models;

    try {
      // Obtener todas las ventas del vendedor
      const ventas = await Venta.findAll({
        where: { vendedor_id: id },
        attributes: ["id", "valor_total", "fecha_venta"],
        include: [
          {
            model: Pago,
            as: "pagos",
            attributes: ["id", "monto_pagado", "fecha_pago", "metodo_pago"], // Incluir detalles de los pagos
          },
        ],
      });

      // Procesar los datos para calcular el saldo
      const cartera = ventas.map((venta) => {
        const totalPagos = venta.pagos.reduce(
          (total, pago) => total + parseFloat(pago.monto_pagado),
          0
        );
        return {
          venta_id: venta.id,
          fecha_venta: venta.fecha_venta,
          valor_venta: parseFloat(venta.valor_total),
          total_pagos: totalPagos,
          pagos: venta.pagos.map((pago) => ({
            pago_id: pago.id,
            monto_pagado: parseFloat(pago.monto_pagado),
            fecha_pago: pago.fecha_pago,
            metodo_pago: pago.metodo_pago,
          })),
          saldo: parseFloat(venta.valor_total) - totalPagos,
        };
      });

      // Calcular el saldo total del vendedor
      const totalVentas = cartera.reduce(
        (total, item) => total + item.valor_venta,
        0
      );
      const totalPagos = cartera.reduce(
        (total, item) => total + item.total_pagos,
        0
      );
      const saldoTotal = totalVentas - totalPagos;

      res.json({
        ventas: cartera,
        totales: {
          totalVentas,
          totalPagos,
          saldoTotal,
        },
      });
    } catch (error) {
      console.error("Error al obtener el detalle de cartera:", error.message);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  });

  return router;
};
