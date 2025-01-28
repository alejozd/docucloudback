const { Sequelize, DataTypes } = require("sequelize");
const db = require("../config/database");

const RegistroSolicitud = db.define(
  "RegistroSolicitud",
  {
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
      defaultValue: Sequelize.NOW,
    },
  },
  {
    tableName: "registro_solicitudes",
    timestamps: false,
  }
);

module.exports = RegistroSolicitud;
