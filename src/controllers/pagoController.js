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
  const { venta_id, monto_pagado, fecha_pago, metodo_pago } = datos;
  try {
    const nuevoPago = await models.Pago.create({
      venta_id,
      monto_pagado,
      fecha_pago,
      metodo_pago,
    });
    return nuevoPago;
  } catch (error) {
    throw new Error("Error al crear el pago.");
  }
};

exports.updatePago = async (models, id, datos) => {
  try {
    const pago = await models.Pago.findByPk(id);
    if (!pago) {
      throw new Error("Pago no encontrado.");
    }
    await pago.update(datos);
    return pago;
  } catch (error) {
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
    return { message: "Pago eliminado correctamente." };
  } catch (error) {
    throw new Error("Error al eliminar el pago.");
  }
};
