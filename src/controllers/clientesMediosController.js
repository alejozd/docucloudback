exports.getClientesMedios = async (models) => {
  const { ClienteMedio } = models;
  try {
    const clientes = await ClienteMedio.findAll({
      include: [
        {
          model: models.Vendedor,
          as: "vendedor",
          attributes: ["id", "nombre"],
        },
      ],
    });
    return clientes;
  } catch (error) {
    throw new Error("Error al obtener los clientes medios.");
  }
};

exports.getClienteMedioById = async (models, id) => {
  const { ClienteMedio } = models;
  try {
    const cliente = await ClienteMedio.findByPk(id, {
      include: [
        {
          model: models.Vendedor,
          as: "vendedor",
          attributes: ["id", "nombre"],
        },
      ],
    });
    if (!cliente) {
      throw new Error("Cliente medio no encontrado.");
    }
    return cliente;
  } catch (error) {
    throw new Error(error.message || "Error al obtener el cliente medio.");
  }
};

exports.createClienteMedio = async (models, datos) => {
  try {
    return await models.ClienteMedio.create(datos);
  } catch (error) {
    throw new Error(error.message || "Error al crear el cliente medio.");
  }
};

exports.updateClienteMedio = async (models, id, datos) => {
  try {
    const cliente = await models.ClienteMedio.findByPk(id);
    if (!cliente) throw new Error("Cliente medio no encontrado.");
    await cliente.update(datos);
    return cliente;
  } catch (error) {
    throw new Error(error.message || "Error al actualizar el cliente medio.");
  }
};

exports.deleteClienteMedio = async (models, id) => {
  try {
    const cliente = await models.ClienteMedio.findByPk(id);
    if (!cliente) throw new Error("Cliente medio no encontrado.");
    await cliente.destroy();
    return { message: "Cliente medio eliminado correctamente." };
  } catch (error) {
    throw new Error(error.message || "Error al eliminar el cliente medio.");
  }
};
