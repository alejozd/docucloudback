// src/routes/testRoutes.js
const express = require("express");
const { testConnection } = require("../controllers/testController");

const router = express.Router();

// Ruta para probar la conexión a la base de datos
router.get("/test-connection", testConnection);

module.exports = router;
