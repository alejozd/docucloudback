const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, // ← NUEVO: puerto configurable
    dialect: "mysql",
    timezone: "-05:00",
    dialectOptions: {
      connectTimeout: 10000, // 10 segundos
    },
  },
);

module.exports = sequelize;
