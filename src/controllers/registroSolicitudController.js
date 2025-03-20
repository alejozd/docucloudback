const { Op } = require("sequelize");

module.exports = ({ RegistroSolicitud, Autorizacion }) => {
  // Obtener registros de solicitudes con filtros opcionales (usando POST)
  const getRegistrosSolicitud = async (req, res) => {
    const { ip_cliente, estado } = req.body; // Obtener los filtros desde el body de la solicitud

    try {
      const whereClause = {}; // Inicializamos la cláusula WHERE de la consulta

      // Si se pasa el filtro por IP, lo agregamos al whereClause
      if (ip_cliente) {
        whereClause.ip_cliente = { [Op.like]: `%${ip_cliente}%` }; // Búsqueda parcial de IP
      }

      // Si se pasa el filtro por estado, lo agregamos al whereClause
      if (estado) {
        whereClause.estado = estado;
      }

      // Obtener los registros filtrados de la base de datos
      const registros = await RegistroSolicitud.findAll({
        where: whereClause,
        include: [
          {
            model: Autorizacion,
            as: "autorizacion", // Alias definido en las asociaciones
            attributes: ["nombre"], // Solo traer el nombre
          },
        ],
      });

      // Si no hay registros, retornamos un mensaje adecuado
      if (!registros.length) {
        return res.status(404).json({ message: "No se encontraron registros" });
      }

      // Devolvemos los registros encontrados
      res.json(registros);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  return { getRegistrosSolicitud };
};
