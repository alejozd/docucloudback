module.exports = (sequelize, DataTypes) => {
  const Pago = sequelize.define(
    "Pago",
    {
      venta_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      monto_pagado: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      fecha_pago: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      metodo_pago: {
        type: DataTypes.ENUM("efectivo", "transferencia", "tarjeta"),
        defaultValue: "efectivo",
      },
    },
    {
      tableName: "pagos",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Asociaciones
  Pago.associate = (models) => {
    Pago.belongsTo(models.Venta, {
      foreignKey: "venta_id",
      as: "venta",
    });
  };

  return Pago;
};
