// src/controllers/testController.js
const sequelize = require("../config/database");

const testConnection = async (req, res) => {
  try {
    const [results, metadata] = await sequelize.query(
      "SELECT NOW() AS currentTime"
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { testConnection };
