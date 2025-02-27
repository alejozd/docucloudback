module.exports = (sequelize, DataTypes) => {
  const AsociarClienteContacto = sequelize.define(
    "asociarclientecontacto",
    {
      idasoclicont: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      idcliente: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      idcontacto: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "asociarclientecontacto", // Nombre de la tabla en la base de datos
      timestamps: false, // Desactiva las marcas de tiempo si no están en tu tabla
    }
  );

  return AsociarClienteContacto;
};
