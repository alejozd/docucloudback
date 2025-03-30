exports.getPagos = async (models) => {
  try {
    const pagos = await models.Pago.findAll({
      include: [
        {
          model: models.Venta,
          as: "venta",
          attributes: ["id", "valor_total"],
        },
      ],
    });
    return pagos;
  } catch (error) {
    throw new Error("Error al obtener los pagos.");
  }
};

exports.createPago = async (models, datos) => {
  try {
    const nuevoPago = await models.Pago.create(datos);

    // Calcular el total pagado
    const totalPagado = await models.Pago.sum("monto_pagado", {
      where: { venta_id },
    });

    // Obtener la venta asociada
    const venta = await models.Venta.findByPk(venta_id);
    if (!venta) {
      throw new Error("Venta no encontrada.");
    }

    // Determinar el nuevo estado de pago
    let nuevoEstado = "pendiente";
    if (totalPagado >= venta.valor_total) {
      nuevoEstado = "completo";
    } else if (totalPagado > 0) {
      nuevoEstado = "parcial";
    }

    // Actualizar la venta con el nuevo estado de pago
    await venta.update({ estado_pago: nuevoEstado });

    return nuevoPago;
  } catch (error) {
    throw new Error("Error al crear el pago.");
  }
};

exports.updatePago = async (models, id, datos) => {
  try {
    // Buscar el pago por su ID
    const pago = await models.Pago.findByPk(id);
    if (!pago) {
      throw new Error("Pago no encontrado.");
    }

    // Actualizar el pago con los datos recibidos
    await pago.update(datos);

    // Recalcular el estado de la venta
    const totalPagado = await models.Pago.sum("monto_pagado", {
      where: { venta_id: pago.venta_id },
    });

    // Obtener la venta asociada
    const venta = await models.Venta.findByPk(pago.venta_id);
    if (!venta) {
      console.error("❌ Venta no encontrada.");
      throw new Error("Venta no encontrada.");
    }

    // Convertir `valor_total` a número si es un string
    const totalVenta = parseFloat(venta.valor_total);

    // Determinar el nuevo estado de pago
    let nuevoEstado = "pendiente";
    if (totalPagado >= totalVenta) {
      nuevoEstado = "completo";
    } else if (totalPagado > 0) {
      nuevoEstado = "parcial";
    }

    // Actualizar estado de la venta
    await venta.update({ estado_pago: nuevoEstado });
    return pago;
  } catch (error) {
    console.error("❌ Error en updatePago:", error.message);
    throw new Error("Error al actualizar el pago.");
  }
};

exports.deletePago = async (models, id) => {
  try {
    const pago = await models.Pago.findByPk(id);
    if (!pago) {
      throw new Error("Pago no encontrado.");
    }
    await pago.destroy();

    // Recalcular el estado de la venta tras eliminar un pago
    const totalPagado = await models.Pago.sum("monto_pagado", {
      where: { venta_id },
    });
    const venta = await models.Venta.findByPk(venta_id);
    let nuevoEstado = "pendiente";
    if (totalPagado >= venta.valor_total) {
      nuevoEstado = "completo";
    } else if (totalPagado > 0) {
      nuevoEstado = "parcial";
    }
    await venta.update({ estado_pago: nuevoEstado });

    return { message: "Pago eliminado correctamente." };
  } catch (error) {
    throw new Error("Error al eliminar el pago.");
  }
};
