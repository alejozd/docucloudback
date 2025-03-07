// controllers/serialesERPController.js

exports.getSerialesERP = async (models) => {
  const { SerialERP } = models;
  try {
    const seriales = await SerialERP.findAll({
      include: [
        {
          model: models.ClienteMedio,
          as: "cliente",
          attributes: ["id", "nombre_completo"],
        },
      ],
    });
    return seriales;
  } catch (error) {
    console.error("Error al obtener los seriales ERP:", error.message);
    throw new Error("Error al obtener los seriales ERP.");
  }
};

exports.getSerialERPByIdOrSerial = async (models, identifier) => {
  const { SerialERP } = models;
  try {
    let serial;

    // Intentar buscar por ID
    if (!isNaN(identifier)) {
      serial = await SerialERP.findByPk(identifier, {
        include: [
          {
            model: models.ClienteMedio,
            as: "cliente",
            attributes: ["nombre_completo"],
          },
        ],
      });
    }

    // Si no se encuentra por ID, intentar buscar por serial_erp
    if (!serial) {
      serial = await SerialERP.findOne({
        where: { serial_erp: identifier },
        include: [
          {
            model: models.ClienteMedio,
            as: "cliente",
            attributes: ["nombre_completo"],
          },
        ],
      });
    }

    if (!serial) {
      throw new Error("Serial ERP no encontrado.");
    }

    return serial;
  } catch (error) {
    throw error;
  }
};

exports.createSerialERP = async (models, data) => {
  const { SerialERP, ClienteMedio } = models;
  try {
    // Validar que el cliente_id exista
    const cliente = await ClienteMedio.findByPk(data.cliente_id);
    if (!cliente) {
      throw new Error("El cliente especificado no existe.");
    }

    // Crear el nuevo serial ERP
    const nuevoSerial = await SerialERP.create(data);
    return nuevoSerial;
  } catch (error) {
    throw new Error(`Error al crear el serial ERP: ${error.message}`);
  }
};

exports.updateSerialERP = async (models, id, data) => {
  const { SerialERP, ClienteMedio } = models;
  try {
    const serial = await SerialERP.findByPk(id);
    if (!serial) {
      throw new Error("Serial ERP no encontrado.");
    }

    // Validar que el cliente_id exista si se está actualizando
    if (data.cliente_id) {
      const cliente = await ClienteMedio.findByPk(data.cliente_id);
      if (!cliente) {
        throw new Error("El cliente especificado no existe.");
      }
    }

    await serial.update(data);
    return serial;
  } catch (error) {
    throw error;
  }
};

exports.deleteSerialERP = async (models, id) => {
  const { SerialERP } = models;
  try {
    const serial = await SerialERP.findByPk(id);
    if (!serial) {
      throw new Error("Serial ERP no encontrado.");
    }

    await serial.destroy();
    return { message: "Serial ERP eliminado correctamente." };
  } catch (error) {
    throw error;
  }
};
