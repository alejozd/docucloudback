const crypto = require("crypto");

// Función para decodificar Base64
function decodeBase64(encodedString) {
  return Buffer.from(encodedString, "base64").toString("utf-8");
}

// Función para generar un hash MD5
function generateMD5Hash(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

// Controlador para generar la clave desde el serial
exports.generarClaveDesdeSerial = async (req, res) => {
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

    // Separar los datos concatenados (asumiendo que están separados por PistaDos)
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
      macServidor = macServidor.substring(1); // Eliminar el primer carácter
    }

    // Concatenar los datos para generar la clave
    const datosConcatenados = `${serialERP}${pistaDos}${anoMedios}${macServidor}`;

    // Generar la clave MD5
    const claveGenerada = generateMD5Hash(datosConcatenados);

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
