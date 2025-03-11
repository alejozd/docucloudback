exports.getVentas = async (models) => {
  try {
    const ventas = await models.Venta.findAll({
      include: [
        {
          model: models.Vendedor,
          as: "vendedor",
          attributes: ["id", "nombre"],
        },
        {
          model: models.ClienteMedio,
          as: "cliente_medio",
          attributes: ["id", "nombre_completo"],
        },
      ],
    });
    return ventas;
  } catch (error) {
    throw new Error("Error al obtener las ventas.");
  }
};

exports.createVenta = async (models, datos) => {
  const { vendedor_id, cliente_medio_id, fecha_venta, valor_total } = datos;
  try {
    const nuevaVenta = await models.Venta.create({
      vendedor_id,
      cliente_medio_id,
      fecha_venta,
      valor_total,
    });
    return nuevaVenta;
  } catch (error) {
    throw new Error("Error al crear la venta.");
  }
};

exports.updateVenta = async (models, id, datos) => {
  try {
    const venta = await models.Venta.findByPk(id);
    if (!venta) {
      throw new Error("Venta no encontrada.");
    }
    await venta.update(datos);
    return venta;
  } catch (error) {
    throw new Error("Error al actualizar la venta.");
  }
};

exports.deleteVenta = async (models, id) => {
  try {
    const venta = await models.Venta.findByPk(id);
    if (!venta) {
      throw new Error("Venta no encontrada.");
    }
    await venta.destroy();
    return { message: "Venta eliminada correctamente." };
  } catch (error) {
    throw new Error("Error al eliminar la venta.");
  }
};
