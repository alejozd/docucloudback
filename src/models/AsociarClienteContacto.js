const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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
    tableName: "asociarclientecontacto",
    timestamps: false,
  }
);

module.exports = AsociarClienteContacto;
