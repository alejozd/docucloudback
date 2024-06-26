const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// Modelo de ejemplo para la tabla de usuarios.

const Cliente = sequelize.define(
  "clientes",
  {
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
      allowNull: true,
    },
    telefonoc1: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailc1: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    contacto2: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telefonoc2: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailc2: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "clientes", // Asegúrate de que el nombre de la tabla sea correcto
    timestamps: false, // Desactiva las marcas de tiempo si no están en tu tabla
  }
);

module.exports = Cliente;
