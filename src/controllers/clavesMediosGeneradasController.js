// controllers/clavesMediosGeneradasController.js

exports.getClavesGeneradas = async (models) => {
  const { ClaveGenerada, SerialERP, ClienteMedio } = models;
  try {
    const claves = await ClaveGenerada.findAll({
      include: [
        {
          model: SerialERP,
          as: "serial", // Alias definido en las asociaciones
          attributes: ["id", "serial_erp"], // Solo necesitamos estos atributos
          include: [
            {
              model: ClienteMedio, // Incluir ClienteMedio dentro de SerialERP
              as: "cliente", // Alias definido en las asociaciones
              attributes: ["nombre_completo"], // Solo seleccionar el nombre del cliente
            },
          ],
        },
      ],
    });
    if (!claves || claves.length === 0) {
      throw new Error("No se encontraron claves generadas.");
    }
    return claves;
  } catch (error) {
    console.error("Error al obtener las claves generadas:", error.message);
    throw new Error("Error al obtener las claves generadas.");
  }
};
