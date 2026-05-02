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
      },
      instalacion_hash: {
        type: DataTypes.STRING,
        allowNull: true,  // Permitir null hasta que se active la licencia
      },
      estado: {
        type: DataTypes.ENUM("demo", "activa", "bloqueado"),
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
        allowNull: false,
      },
      ultima_ip: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      version_app: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tipo_licencia: {
        type: DataTypes.ENUM('demo', 'anual', 'permanente'),
        allowNull: false,
        defaultValue: 'demo',
      },
      dias_licencia: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "licencias",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["nit", "app"],
        },
      ],
    }
  );

  return model;
};

module.exports = Licencia;
