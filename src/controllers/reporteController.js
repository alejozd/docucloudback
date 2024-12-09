const crypto = require("crypto");

// Decodificar Base64
function decodeFromBase64(encodedData) {
  return Buffer.from(encodedData, "base64").toString("utf-8");
}

// Generar clave MD5
function generateMD5(input) {
  return crypto
    .createHash("md5")
    .update(input, "utf8")
    .digest("hex")
    .substring(0, 16)
    .toUpperCase();
}

// Procesar el serial
function processSerial(serial) {
  const decodedString = decodeFromBase64(serial);
  //   console.log("serial: ", serial);
  // Verificar y dividir la cadena
  const separator = "*-+";
  const separatorPos = decodedString.indexOf(separator);
  if (separatorPos === -1) {
    throw new Error("Formato del serial no válido.");
  }

  const soloSerial = decodedString.substring(0, separatorPos);
  const datosPC = decodedString.substring(separatorPos + separator.length);

  // Dividir datosPC por "|"
  const parts = datosPC.split("|");
  if (parts.length < 4) {
    throw new Error(
      "Formato del serial no válido: se esperaban al menos 4 partes."
    );
  }

  const procesadorId = parts[0];
  const hardDriveSerial = parts[1];
  const systemName = parts[2];
  const letraModulo = parts[3].charAt(0);

  // Determinar módulo
  let modulo;
  switch (letraModulo) {
    case "T":
      modulo = "Todos";
      break;
    case "R":
      modulo = "Remisiones";
      break;
    case "P":
      modulo = "Pedidos";
      break;
    default:
      modulo = "Desconocido";
  }

  // Generar la clave
  const claveInput = soloSerial + letraModulo;
  const clave = generateMD5(claveInput);

  return {
    soloSerial,
    procesadorId,
    hardDriveSerial,
    systemName,
    letraModulo,
    modulo,
    clave,
  };
}

// Controlador para manejar la solicitud
exports.generateReportKey = (req, res) => {
  try {
    const { serial } = req.body;

    if (!serial) {
      return res.status(400).json({ error: "Serial no proporcionado." });
    }

    const result = processSerial(serial);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
