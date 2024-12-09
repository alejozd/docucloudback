const Contacto = require("../models/Contacto");
const Segmento = require("../models/Segmento");

// Obtener todos los contactos
const getAllContactos = async (req, res) => {
  try {
    // console.log("Request body:", req.body);
    const contactos = await Contacto.findAll({
      include: [
        { model: Segmento, attributes: ["idsegmento", "nombresegmento"] },
      ],
    });

    // Mapea los contactos para que solo incluya el nombresegmento junto con el idsegmento
    const contactosConSegmento = contactos.map((contacto) => {
      const contactoJson = contacto.toJSON();
      if (contactoJson.segmento) {
        contactoJson.nombresegmento = contactoJson.segmento.nombresegmento;
        contactoJson.idsegmento = contactoJson.segmento.idsegmento;
      } else {
        contactoJson.nombresegmento = null;
        contactoJson.idsegmento = null;
      }
      delete contactoJson.segmento; // Elimina el objeto segmento ya que ahora tienes idsegmento y nombresegmento
      return contactoJson;
    });

    // console.log("Response body contactosConSegmento:", contactosConSegmento);
    res.json(contactosConSegmento);
  } catch (error) {
    console.error("Error al obtener los contactos:", error);
    res.status(500).json({ message: "Error al obtener los contactos." });
  }
};

// Crear un nuevo contacto
const createContacto = async (req, res) => {
  try {
    // console.log("Request body:", req.body); // Log the request body to see what data is being sent
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
