module.exports = (sequelize, DataTypes) => {
  const ClienteMedio = sequelize.define(
    "ClienteMedio",
    {
      nombre_completo: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      telefono: {
        type: DataTypes.STRING(20),
      },
      empresa: {
        type: DataTypes.STRING(255),
      },
      direccion: {
        type: DataTypes.TEXT,
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "clientes_medios",
      timestamps: true,
      createdAt: "created_at", // Especifica el nombre de la columna para createdAt
      updatedAt: "updated_at", // Especifica el nombre de la columna para updatedAt)
    }
  );

  // Asociaciones
  ClienteMedio.associate = (models) => {
    ClienteMedio.hasMany(models.SerialERP, {
      foreignKey: "cliente_id",
      as: "seriales",
    });
  };

  return ClienteMedio;
};
