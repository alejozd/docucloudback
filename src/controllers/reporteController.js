const crypto = require("crypto");

// Decodificar Base64
function decodeFromBase64(encodedData) {
  return Buffer.from(encodedData, "base64").toString("utf-8");
}

// Generar clave MD5: usa los primeros 16 caracteres y convierte a mayúsculas
function generateMD5(input) {
  return crypto
    .createHash("md5")
    .update(input, "utf8")
    .digest("hex")
    .substring(0, 16) // Usar solo los primeros 16 caracteres, igual que en Delphi
    .toUpperCase(); // Convertir a mayúsculas (Delphi lo hace por defecto con HashStringAsHex)
}

// Función auxiliar para determinar la descripción de los módulos
// Esta función ahora usa el ModuloIdentificador completo.
function getModuleDescription(moduleIdentifier) {
  if (!moduleIdentifier || moduleIdentifier.trim() === "") {
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
    // Si la cadena de módulos no coincide con ninguna letra válida, devuelve "Módulo no especificado"
    return "Módulo no especificado";
  }
}

// Procesar el serial
function processSerial(serial) {
  const decodedString = decodeFromBase64(serial);
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

  // *** CORRECCIÓN CRÍTICA: parts[3] contiene la cadena completa de módulos (ej: 'RPHC')
  const ModuloIdentificador = parts[3];

  // Determinar la descripción del módulo
  const moduloDescription = getModuleDescription(ModuloIdentificador);

  // Generar la clave
  // El input para la clave debe ser soloSerial + ModuloIdentificador (la cadena completa)
  const claveInput = soloSerial + ModuloIdentificador;
  const clave = generateMD5(claveInput);

  return {
    soloSerial,
    procesadorId,
    hardDriveSerial,
    systemName,
    letraModulo: ModuloIdentificador, // La cadena completa (ej: 'RPHC')
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

    // console.log("Clave generada:", result.clave); // Útil para depurar

    return res.status(200).json(result);
  } catch (error) {
    // console.error("Error al generar la clave:", error.message); // Útil para depurar
    return res.status(400).json({ error: error.message });
  }
};
