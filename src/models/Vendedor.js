module.exports = (sequelize, DataTypes) => {
  const Vendedor = sequelize.define(
    "Vendedor", // Nombre del modelo
    {
      nombre: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      telefono: {
        type: DataTypes.STRING(20),
        allowNull: true, // El teléfono es opcional
      },
      activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Valor predeterminado: true
      },
    },
    {
      tableName: "vendedores", // Nombre de la tabla en la base de datos
      timestamps: true, // Habilita createdAt y updatedAt
      createdAt: "created_at", // Especifica el nombre de la columna para createdAt
      updatedAt: "updated_at", // Especifica el nombre de la columna para updatedAt
    }
  );

  // Asociaciones
  Vendedor.associate = (models) => {
    Vendedor.hasMany(models.ClienteMedio, {
      foreignKey: "vendedor_id",
      as: "clientes",
    });
  };

  return Vendedor;
};
