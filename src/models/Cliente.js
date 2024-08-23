const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const AsociarClienteContacto = require("./AsociarClienteContacto");

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
    regimen: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    area_ica: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    regimen_fel: {
      type: DataTypes.SMALLINT,
      allowNull: true,
    },
    responsabilidad_fel: {
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
