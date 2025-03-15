const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Autorizacion = sequelize.define(
  "Autorizacion",
  {
    idautorizacion: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("autorizado", "no_autorizado"),
      defaultValue: "no_autorizado",
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    comentarios: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    fecha_modificacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      onUpdate: DataTypes.NOW,
    },
    intentos_envio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "autorizacion",
    timestamps: false, // No utilizar timestamps automáticos
  }
);

module.exports = Autorizacion;
