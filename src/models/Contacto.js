const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const AsociarClienteContacto = require("./AsociarClienteContacto");

// Modelo de ejemplo para la tabla de usuarios.

const Contacto = sequelize.define(
  "contactos",
  {
    idcontacto: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombresca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    identidadca: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    direccionca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefonoca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    emailca: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "contactos", // Asegúrate de que el nombre de la tabla sea correcto
    timestamps: false, // Desactiva las marcas de tiempo si no están en tu tabla
  }
);

module.exports = Contacto;
