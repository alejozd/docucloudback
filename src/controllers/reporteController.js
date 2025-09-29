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

// Función auxiliar para determinar la descripción de los módulos
function getModuleDescription(moduleIdentifier) {
  if (!moduleIdentifier) {
    return "Módulo no especificado";
  }

  let sModulos = "";
  // El orden no importa para la lógica, pero lo mantenemos para referencia
  if (moduleIdentifier.includes("R")) sModulos += "Remisiones, ";
  if (moduleIdentifier.includes("P")) sModulos += "Pedidos, ";
  if (moduleIdentifier.includes("H")) sModulos += "Herramientas, ";
  if (moduleIdentifier.includes("C")) sModulos += "Cartera, ";

  // Eliminar la coma y el espacio final
  if (sModulos.length > 2) {
    return sModulos.substring(0, sModulos.length - 2);
  } else {
    return "Módulo no especificado";
  }
}

// Procesar el serial
function processSerial(serial) {
  const decodedString = decodeFromBase64(serial);
  //   console.log("serial: ", serial);
  // Verificar y dividir la cadena
  const separator = "*-+";
  const separatorPos = decodedString.indexOf(separator);
  if (separatorPos === -1) {
    throw new Error("Formato del serial no válido: separador no encontrado.");
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
  const ModuloIdentificador = parts[3].charAt(0);

  // Determinar la descripción del módulo (opcional, solo para información de retorno)
  const moduloDescription = getModuleDescription(ModuloIdentificador);

  // Generar la clave
  // *** CAMBIO CRÍTICO: El input para la clave debe ser soloSerial + ModuloIdentificador (la cadena completa)
  const claveInput = soloSerial + ModuloIdentificador;
  const clave = generateMD5(claveInput);

  return {
    soloSerial,
    procesadorId,
    hardDriveSerial,
    systemName,
    letraModulo: ModuloIdentificador, // Renombrado para reflejar que es la cadena completa
    modulo: moduloDescription, // Descripción de los módulos
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
    console.error("Error al generar la clave:", error.message);
    return res.status(400).json({ error: error.message });
  }
};
