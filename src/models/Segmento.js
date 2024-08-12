const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Segmento = sequelize.define(
  "segmentos",
  {
    idsegmento: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombresegmento: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "segmentos",
    timestamps: false,
  }
);

module.exports = Segmento;
