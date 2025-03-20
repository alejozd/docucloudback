module.exports = (sequelize, DataTypes) => {
  const RegistroSolicitud = sequelize.define(
    "RegistroSolicitud", // Nombre del modelo
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ip_cliente: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      id_autorizacion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      estado: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fecha_solicitud: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "registro_solicitudes", // Nombre de la tabla en la base de datos
      timestamps: false, // Desactiva timestamps si no los usas
    }
  );

  return RegistroSolicitud;
};
