const express = require("express");
const { loginController } = require("../controllers/authController");

const router = express.Router();

// Ruta para el login
router.post("/login", loginController);

module.exports = router;
