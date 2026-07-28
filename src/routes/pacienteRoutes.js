const express = require("express");
const { getPacientes } = require("../controllers/pacienteController");
const { authenticateApiKey } = require("../middlewares/apiKeyMiddleware");

const router = express.Router();

router.get("/pacientes", authenticateApiKey, getPacientes);

module.exports = router;
