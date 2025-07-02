const fs = require("fs");
const path = require("path");

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
exports.listarGrabaciones = (req, res) => {
  const directorioBase = "/var/www/radio_grabaciones";

  try {
    const años = fs.readdirSync(directorioBase);
    const lista = [];

    años.forEach((año) => {
      const meses = fs.readdirSync(path.join(directorioBase, año));
      meses.forEach((mes) => {
        const dias = fs.readdirSync(path.join(directorioBase, año, mes));
        dias.forEach((dia) => {
          const archivos = fs
            .readdirSync(path.join(directorioBase, año, mes, dia))
            .filter((archivo) => archivo.endsWith(".mp3"));

          if (archivos.length > 0) {
            const fecha = `${año}-${mes}-${dia}`;
            lista.push({ fecha, archivos });
          }
        });
      });
    });

    return res.json(lista);
  } catch (error) {
    console.error("Error al leer las grabaciones:", error);
    return res.status(500).json({ error: "No se pudo listar las grabaciones" });
  }
};
