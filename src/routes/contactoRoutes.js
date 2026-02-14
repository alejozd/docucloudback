const express = require("express");
const {
  getAllContactos,
  createContacto,
  updateContacto,
} = require("../controllers/contactoController");

const router = express.Router();

router.route("/contactos").get(getAllContactos).post(createContacto);
router.put("/contactos/:id", updateContacto);

module.exports = router;
