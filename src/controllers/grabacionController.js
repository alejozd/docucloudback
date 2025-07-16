const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");

const CONFIG_PATH = path.join(__dirname, "../config/grabacion.json");

// Obtener estado actual
exports.getEstadoGrabacion = (req, res) => {
  try {
    const data = fs.readFileSync(CONFIG_PATH);
    const estado = JSON.parse(data);
    return res.json(estado);
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error al leer el estado de grabación" });
  }
};

// Actualizar estado
exports.setEstadoGrabacion = (req, res) => {
  const { activo } = req.body;

  if (typeof activo !== "boolean") {
    return res
      .status(400)
      .json({ error: 'Campo "activo" es requerido y debe ser booleano' });
  }

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ activo }, null, 2));
    return res.json({ ok: true, activo });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Error al actualizar el estado de grabación" });
  }
};

// Listar grabaciones
exports.listarGrabaciones = async (req, res) => {
  // CAMBIO: Ahora es una función asíncrona
  const directorioBase = "/var/www/radio_grabaciones";
  const lista = [];

  try {
    const años = fs.readdirSync(directorioBase);

    for (const año of años) {
      // Usamos for...of para poder usar await
      const meses = fs.readdirSync(path.join(directorioBase, año));

      for (const mes of meses) {
        // Usamos for...of
        const dias = fs.readdirSync(path.join(directorioBase, año, mes));

        for (const dia of dias) {
          // Usamos for...of
          const archivosEnDirectorio = fs
            .readdirSync(path.join(directorioBase, año, mes, dia))
            .filter((archivo) => archivo.endsWith(".mp3"));

          const archivosConMetadatos = [];

          for (const nombreArchivo of archivosEnDirectorio) {
            // Usamos for...of para await
            const rutaCompletaArchivo = path.join(
              directorioBase,
              año,
              mes,
              dia,
              nombreArchivo
            );
            let titulo = nombreArchivo.replace(".mp3", ""); // Título por defecto
            let artista = "Desconocido"; // Artista por defecto
            let duracion = 0; // Duración por defecto

            try {
              const metadata = await mm.parseFile(rutaCompletaArchivo);
              if (metadata.common) {
                titulo = metadata.common.title || titulo;
                artista = metadata.common.artist || artista;
              }
              if (metadata.format && metadata.format.duration) {
                duracion = Math.round(metadata.format.duration); // Duración en segundos
              }
            } catch (metadataError) {
              // No es crítico si no se pueden leer los metadatos de un archivo
              console.warn(
                `No se pudieron leer metadatos de ${nombreArchivo}:`,
                metadataError.message
              );
            }

            archivosConMetadatos.push({
              nombreArchivo: nombreArchivo,
              titulo: titulo,
              artista: artista,
              duracion_segundos: duracion,
              // Puedes añadir más campos si los necesitas, como 'album', 'year', etc.
            });
          }

          if (archivosConMetadatos.length > 0) {
            const fecha = `${año}-${mes}-${dia}`;
            lista.push({ fecha, archivos: archivosConMetadatos });
          }
        }
      }
    }

    return res.json(lista);
  } catch (error) {
    console.error("Error al leer las grabaciones:", error);
    return res.status(500).json({ error: "No se pudo listar las grabaciones" });
  }
};
