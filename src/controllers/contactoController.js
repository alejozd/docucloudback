const Contacto = require("../models/Contacto");

// Obtener todos los contactos
const getAllContactos = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const contactos = await Contacto.findAll();
    console.log("Response body contactos:", contactos);
    res.json(contactos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Crear un nuevo contacto
const createContacto = async (req, res) => {
  try {
    console.log("Request body:", req.body); // Log the request body to see what data is being sent
    const contacto = await Contacto.create(req.body);
    res.status(201).json(contacto);
  } catch (error) {
    console.error("Error creating contacto:", error); // Log the error details
    res.status(500).json({ error: error.message });
  }
};

// Actualizar un contacto existente
const updateContacto = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Contacto.update(req.body, {
      where: { idcontacto: id },
    });
    if (updated !== 0) {
      const updatedContacto = await Contacto.findOne({
        where: { idcontacto: id },
      });
      res.status(200).json(updatedContacto);
    } else {
      // throw new Error("Contacto not found");
      res.status(200).json({ message: "No hubo cambios en el Contacto" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllContactos, createContacto, updateContacto };
