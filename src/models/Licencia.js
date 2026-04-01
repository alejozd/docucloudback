const { DataTypes } = require("sequelize");

const Licencia = (sequelize, DataTypes) => {
  const model = sequelize.define(
    "Licencia",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nit: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      instalacion_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      estado: {
        type: DataTypes.ENUM("demo", "activo", "bloqueado"),
        allowNull: false,
        defaultValue: "demo",
      },
      fecha_activacion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fecha_expiracion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dias_demo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
      },
      ultima_validacion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      app: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "licencias",
      timestamps: true,
      underscored: true,
    }
  );

  return model;
};

module.exports = Licencia;
