module.exports = (sequelize, DataTypes) => {
  const Venta = sequelize.define(
    "Venta",
    {
      vendedor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cliente_medio_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      fecha_venta: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      valor_total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      estado_pago: {
        type: DataTypes.ENUM("pendiente", "parcial", "completo"),
        defaultValue: "pendiente",
      },
      estado_instalacion: {
        type: DataTypes.ENUM("pendiente", "instalado"),
        defaultValue: "pendiente",
      },
    },
    {
      tableName: "ventas",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Asociaciones
  Venta.associate = (models) => {
    Venta.belongsTo(models.Vendedor, {
      foreignKey: "vendedor_id",
      as: "vendedor",
    });
    Venta.belongsTo(models.ClienteMedio, {
      foreignKey: "cliente_medio_id",
      as: "cliente_medio",
    });
    Venta.hasMany(models.Pago, {
      foreignKey: "venta_id",
      as: "pagos",
    });
  };

  return Venta;
};
