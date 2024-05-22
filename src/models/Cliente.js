const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Modelo de ejemplo para la tabla de usuarios.

const Cliente = sequelize.define("Clientes", {
  idcliente: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombres: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  identidad: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contacto1: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefonoc1: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  emailc1: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  contacto2: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  telefonoc2: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  emailc2: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Cliente;
