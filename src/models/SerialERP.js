module.exports = (sequelize, DataTypes) => {
  const SerialERP = sequelize.define(
    "serial_erp", // Nombre del modelo
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      serial_erp: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      ano_medios: {
        type: DataTypes.STRING(4),
        allowNull: false,
      },
      cliente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "seriales_erp", // Nombre de la tabla en la base de datos
      timestamps: true, // Habilita createdAt y updatedAt
      createdAt: "created_at", // Especifica el nombre de la columna para createdAt
      updatedAt: "updated_at", // Especifica el nombre de la columna para updatedAt)
    }
  );

  return SerialERP;
};
