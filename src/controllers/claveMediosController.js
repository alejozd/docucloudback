const crypto = require("crypto");

// Función para decodificar Base64
function decodeBase64(encodedString) {
  return Buffer.from(encodedString, "base64").toString("utf-8");
}

// Función para generar un hash MD5
function generateMD5Hash(data) {
  return crypto.createHash("md5").update(data).digest("hex").toUpperCase();
  // return crypto.createHash("md5").update(data).digest("hex");
}

// Controlador para generar la clave desde el serial
exports.generarClaveDesdeSerial = async (req, res, models) => {
  const { SerialERP, ClaveGenerada } = models;

  try {
    const { serial } = req.body;

    if (!serial) {
      return res.status(400).json({ error: "El campo 'serial' es requerido." });
    }

    // Decodificar el serial Base64
    let decodedData;
    try {
      decodedData = decodeBase64(serial);
    } catch (error) {
      return res
        .status(400)
        .json({ error: "El serial no es un Base64 válido." });
    }

    // Separar los datos concatenados
    const pistaDos = "ZS8Q5TKU0"; // Constante definida en tu aplicación
    const partes = decodedData.split(pistaDos);

    if (partes.length < 2) {
      return res
        .status(400)
        .json({ error: "El formato del serial no es válido." });
    }

    const serialERP = partes[0];
    const resto = partes[1];
    const anoMedios = resto.substring(0, 4); // Los primeros 4 caracteres son el año
    let macServidor = resto.substring(4); // El resto es la MAC

    // Eliminar el carácter '|' si existe al inicio de la MAC
    if (macServidor.startsWith("|")) {
      macServidor = macServidor.substring(1);
    }

    // Verificar si el serial ERP existe y está activo
    const serialDB = await SerialERP.findOne({
      where: {
        serial_erp: serialERP,
        ano_medios: anoMedios,
        activo: true,
      },
    });

    if (!serialDB) {
      return res
        .status(400)
        .json({ error: "El serial ERP no es válido o no está activo." });
    }

    // Concatenar los datos para generar la clave
    const datosConcatenados = `${serialERP}${pistaDos}${anoMedios}|${macServidor}`;

    // Generar la clave MD5
    const claveGenerada = generateMD5Hash(datosConcatenados);
    console.log("Clave Generada:", claveGenerada); // Salida en mayúsculas

    // Guardar la clave generada en la base de datos
    await ClaveGenerada.create({
      serial_erp_id: serialDB.id,
      mac_servidor: macServidor,
      clave_generada: claveGenerada,
    });

    // Responder con la clave generada
    res.json({
      serialERP,
      pistaDos,
      anoMedios,
      macServidor,
      claveGenerada,
    });
  } catch (error) {
    console.error("Error al generar la clave:", error);
    res
      .status(500)
      .json({ error: "Ocurrió un error al procesar la solicitud." });
  }
};
