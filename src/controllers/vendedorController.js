exports.obtenerVendedores = async (models) => {
  const { Vendedor } = models;
  try {
    const vendedores = await Vendedor.findAll();
    return vendedores;
  } catch (error) {
    throw new Error("Error al obtener los vendedores.");
  }
};

exports.obtenerVendedorPorId = async (models, id) => {
  const { Vendedor } = models;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    return vendedor;
  } catch (error) {
    throw new Error(error.message || "Error al obtener el vendedor.");
  }
};

exports.crearVendedor = async (models, datos) => {
  const { Vendedor } = models;
  const { nombre, telefono } = datos;
  try {
    if (!nombre) {
      throw new Error("El campo 'nombre' es obligatorio.");
    }
    const nuevoVendedor = await Vendedor.create({
      nombre,
      telefono,
    });
    return nuevoVendedor;
  } catch (error) {
    throw new Error(error.message || "Error al crear el vendedor.");
  }
};

exports.actualizarVendedor = async (models, id, datos) => {
  const { Vendedor } = models;
  const { nombre, telefono } = datos;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    await vendedor.update({
      nombre,
      telefono,
    });
    return vendedor;
  } catch (error) {
    throw new Error(error.message || "Error al actualizar el vendedor.");
  }
};

exports.eliminarVendedor = async (models, id) => {
  const { Vendedor } = models;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    await vendedor.destroy();
    return { message: "Vendedor eliminado correctamente." };
  } catch (error) {
    throw new Error(error.message || "Error al eliminar el vendedor.");
  }
};

// 📌 Nueva función separada para obtener la cartera del vendedor
exports.obtenerDetalleCartera = async (models, id) => {
  const { Venta, Pago } = models;

  try {
    const ventas = await Venta.findAll({
      where: { vendedor_id: id },
      attributes: ["id", "valor_total", "fecha_venta"],
      include: [
        {
          model: Pago,
          as: "pagos",
          attributes: ["id", "monto_pagado", "fecha_pago", "metodo_pago"],
        },
      ],
    });

    // Si no hay ventas, devolver estructura vacía con totales en 0
    if (!ventas.length) {
      return {
        ventas: [],
        totales: {
          totalVentas: 0,
          totalPagos: 0,
          saldoTotal: 0,
        },
      };
    }

    const cartera = ventas.map((venta) => {
      const totalPagos = venta.pagos.reduce(
        (total, pago) => total + (parseFloat(pago.monto_pagado) || 0),
        0
      );

      return {
        venta_id: venta.id,
        fecha_venta: venta.fecha_venta,
        valor_venta: parseFloat(venta.valor_total) || 0,
        total_pagos: totalPagos,
        pagos: venta.pagos.map((pago) => ({
          pago_id: pago.id,
          monto_pagado: parseFloat(pago.monto_pagado) || 0,
          fecha_pago: pago.fecha_pago,
          metodo_pago: pago.metodo_pago,
        })),
        saldo: (parseFloat(venta.valor_total) || 0) - totalPagos,
      };
    });

    const totalVentas = cartera.reduce(
      (total, item) => total + item.valor_venta,
      0
    );
    const totalPagos = cartera.reduce(
      (total, item) => total + item.total_pagos,
      0
    );
    const saldoTotal = totalVentas - totalPagos;

    return {
      ventas: cartera,
      totales: {
        totalVentas,
        totalPagos,
        saldoTotal,
      },
    };
  } catch (error) {
    throw new Error(error.message || "Error al obtener el detalle de cartera.");
  }
};

exports.obtenerEstadisticas = async (models) => {
  const { Vendedor, Venta, Pago } = models;

  try {
    // Obtener ventas por vendedor con totales
    const ventas = await Venta.findAll({
      attributes: ["vendedor_id", "valor_total"],
      include: [
        {
          model: Vendedor,
          as: "vendedor",
          attributes: ["id", "nombre"],
          required: false,
        },
      ], // required: false permite NULL
    });

    // Agrupar ventas por vendedor
    const ventasPorVendedor = ventas.reduce((acc, venta) => {
      const vendedorId = venta.vendedor_id || 0; // Usar 0 en lugar de un string
      const nombreVendedor = venta.vendedor
        ? venta.vendedor.nombre
        : "Sin Vendedor";

      if (!acc[vendedorId]) {
        acc[vendedorId] = {
          vendedor_id: vendedorId || null, // Asegurar que sea un ID válido
          nombre: nombreVendedor,
          totalVentas: 0,
          cantidadVentas: 0,
        };
      }
      acc[vendedorId].totalVentas += parseFloat(venta.valor_total) || 0;
      acc[vendedorId].cantidadVentas += 1;
      return acc;
    }, {});

    // Obtener el vendedor con mayor deuda
    const deudas = await Venta.findAll({
      attributes: ["id", "valor_total", "vendedor_id"],
      include: [
        {
          model: Pago,
          as: "pagos",
          attributes: ["monto_pagado"],
        },
        {
          model: Vendedor,
          as: "vendedor",
          attributes: ["nombre"],
          required: true,
        },
      ],
    });

    const deudasPorVendedor = deudas.reduce((acc, venta) => {
      const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];
      const totalPagado = pagos.reduce(
        (total, pago) => total + (parseFloat(pago.monto_pagado) || 0),
        0
      );
      const saldoPendiente = (parseFloat(venta.valor_total) || 0) - totalPagado;

      const vendedorId = venta.vendedor_id || 0;
      const nombreVendedor = venta.vendedor
        ? venta.vendedor.nombre
        : "Sin Vendedor";

      if (!acc[vendedorId]) {
        acc[vendedorId] = {
          nombre: nombreVendedor,
          saldoPendienteTotal: 0,
        };
      }
      acc[vendedorId].saldoPendienteTotal += saldoPendiente;
      return acc;
    }, {});

    // Encontrar el vendedor con la mayor deuda acumulada
    let mayorDeuda = { nombre: "Sin Vendedor", saldoPendiente: 0 };

    Object.values(deudasPorVendedor).forEach((vendedor) => {
      if (vendedor.saldoPendienteTotal > mayorDeuda.saldoPendiente) {
        mayorDeuda = {
          nombre: vendedor.nombre,
          saldoPendiente: vendedor.saldoPendienteTotal,
        };
      }
    });

    // Calcular totales
    const totalVentas = Object.values(ventasPorVendedor).reduce(
      (sum, v) => sum + v.totalVentas,
      0
    );

    const totalPagos = deudas.reduce(
      (sum, venta) =>
        sum +
        (Array.isArray(venta.dataValues.pagos)
          ? venta.dataValues.pagos.reduce(
              (subtotal, pago) =>
                subtotal + (parseFloat(pago.monto_pagado) || 0),
              0
            )
          : 0),
      0
    );

    const saldoPendiente = totalVentas - totalPagos;

    // Agregar cantidad total de ventas y pagos
    const cantidadTotalVentas = ventas.length;
    const cantidadTotalPagos = deudas.reduce(
      (sum, venta) =>
        sum + (Array.isArray(venta.pagos) ? venta.pagos.length : 0),
      0
    );

    // Calcular montos para pagos completos, parciales y pendientes
    let totalPagosCompletos = 0;
    let totalPagosParciales = 0;
    let totalPagosPendientes = 0;

    deudas.forEach((venta) => {
      const pagos = Array.isArray(venta.pagos) ? venta.pagos : [];
      const totalPagado = pagos.reduce(
        (total, pago) => total + (parseFloat(pago.monto_pagado) || 0),
        0
      );
      const valorVenta = parseFloat(venta.valor_total) || 0;

      if (totalPagado === valorVenta) {
        totalPagosCompletos += valorVenta;
      } else if (totalPagado > 0 && totalPagado < valorVenta) {
        totalPagosParciales += totalPagado;
      } else {
        totalPagosPendientes += valorVenta;
      }
    });

    return {
      topVendedores: Object.values(ventasPorVendedor).sort(
        (a, b) => b.totalVentas - a.totalVentas
      ),
      mayorDeuda,
      resumen: {
        totalVentas,
        totalPagos,
        saldoPendiente,
        cantidadTotalVentas,
        cantidadTotalPagos,
        totalPagosCompletos,
        totalPagosParciales,
        totalPagosPendientes,
      },
    };
  } catch (error) {
    throw new Error(
      error.message || "Error al obtener estadísticas de vendedores."
    );
  }
};
