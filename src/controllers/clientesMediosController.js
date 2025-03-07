// controllers/clientesMediosController.js

exports.getClientesMedios = async (models) => {
  const { ClienteMedio } = models;
  try {
    const clientes = await ClienteMedio.findAll({
      attributes: ["id", "nombre_completo"], // Solo necesitamos el ID y el nombre
    });
    if (!clientes || clientes.length === 0) {
      throw new Error("No se encontraron clientes medios.");
    }
    return clientes;
  } catch (error) {
    console.error("Error al obtener los clientes medios:", error.message);
    throw new Error("Error al obtener los clientes medios.");
  }
};

exports.getClienteMedioById = async (models, id) => {
  const { ClienteMedio } = models;
  try {
    const cliente = await ClienteMedio.findByPk(id);
    if (!cliente) {
      throw new Error("Cliente medio no encontrado.");
    }
    return cliente;
  } catch (error) {
    throw error;
  }
};

exports.createClienteMedio = async (models, data) => {
  const { ClienteMedio } = models;
  try {
    const nuevoCliente = await ClienteMedio.create(data);
    return nuevoCliente;
  } catch (error) {
    console.error("Error al crear el cliente medio:", error.message);
    throw new Error("Error al crear el cliente medio.");
  }
};

exports.updateClienteMedio = async (models, id, data) => {
  const { ClienteMedio } = models;
  try {
    const cliente = await ClienteMedio.findByPk(id);
    if (!cliente) {
      throw new Error("Cliente medio no encontrado.");
    }
    await cliente.update(data);
    return cliente;
  } catch (error) {
    throw error;
  }
};

exports.deleteClienteMedio = async (models, id) => {
  const { ClienteMedio } = models;
  try {
    const cliente = await ClienteMedio.findByPk(id);
    if (!cliente) {
      throw new Error("Cliente medio no encontrado.");
    }
    await cliente.destroy();
    return { message: "Cliente medio eliminado correctamente." };
  } catch (error) {
    throw error;
  }
};
