const { Contacto } = require("../models");
const Segmento = require("../models/Segmento");

const handleServerError = (res, error, context) => {
  console.error(`Error in ${context}:`, error);
  return res.status(500).json({ error: error.message });
};

// Obtener todos los contactos
const getAllContactos = async (_req, res) => {
  try {
    const contactos = await Contacto.findAll({
      include: [
        { model: Segmento, attributes: ["idsegmento", "nombresegmento"] },
      ],
    });

    const contactosConSegmento = contactos.map((contacto) => {
      const contactoJson = contacto.toJSON();
      if (contactoJson.segmento) {
        contactoJson.nombresegmento = contactoJson.segmento.nombresegmento;
        contactoJson.idsegmento = contactoJson.segmento.idsegmento;
      } else {
        contactoJson.nombresegmento = null;
        contactoJson.idsegmento = null;
      }
      delete contactoJson.segmento;
      return contactoJson;
    });

    return res.json(contactosConSegmento);
  } catch (error) {
    return handleServerError(res, error, "getAllContactos");
  }
};

// Crear un nuevo contacto
const createContacto = async (req, res) => {
  try {
    const contacto = await Contacto.create(req.body);
    return res.status(201).json(contacto);
  } catch (error) {
    return handleServerError(res, error, "createContacto");
  }
};

// Actualizar un contacto existente
const updateContacto = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Contacto.update(req.body, {
      where: { idcontacto: id },
    });

    if (updated === 0) {
      return res.status(200).json({ message: "No hubo cambios en el Contacto" });
    }

    const updatedContacto = await Contacto.findOne({
      where: { idcontacto: id },
    });

    return res.status(200).json(updatedContacto);
  } catch (error) {
    return handleServerError(res, error, "updateContacto");
  }
};

module.exports = { getAllContactos, createContacto, updateContacto };
