const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");

// Intentar configurar ruta de ffmpeg de forma robusta (mismo patrón que audioProcessingService)
let ffmpegPath = null;

try {
  const ffmpegStatic = require("ffmpeg-static");
  if (ffmpegStatic) {
    ffmpegPath = ffmpegStatic;
    console.log("[videoProcessingService] Usando FFmpeg de ffmpeg-static:", ffmpegPath);
  }
} catch (e) {
  console.warn("[videoProcessingService] ffmpeg-static no encontrado, buscando en el sistema...");
}

if (!ffmpegPath) {
  try {
    const systemFfmpeg = execSync("which ffmpeg || where ffmpeg").toString().trim().split("\n")[0];
    if (systemFfmpeg) {
      ffmpegPath = systemFfmpeg;
      console.log("[videoProcessingService] Usando FFmpeg del sistema:", ffmpegPath);
    }
  } catch (e) {
    console.warn("[videoProcessingService] FFmpeg no encontrado en el PATH del sistema");
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error(
    "[videoProcessingService] CRÍTICO: No se pudo encontrar FFmpeg. No se generarán pósters ni se aplicará faststart."
  );
}

// Nombre de la carpeta de pósters DENTRO de VIDEO_BASE_DIR (se sirve públicamente vía /videos)
const POSTER_DIR_NAME = "_posters";
// Caché de estado de procesamiento, fuera de VIDEO_BASE_DIR (no se sirve públicamente)
const CACHE_DIR = path.join(__dirname, "../../data/video-processing-cache");

const MAX_CONCURRENT_PROCESSING = 2;
const FFMPEG_TIMEOUT_MS = 10 * 60 * 1000; // 10 min: los remux de películas/series grandes pueden tardar aunque sea copia sin recodificar
const POSTER_TIMESTAMP_FRACTION = 0.1;
const POSTER_TIMESTAMP_FALLBACK_SECONDS = 1;

// Calcula un timestamp (en segundos) seguro para el póster a partir de la duración real del
// video. No usamos porcentajes de fluent-ffmpeg (p.ej. "10%") porque eso requiere ffprobe,
// que no está instalado en este proyecto (solo ffmpeg-static) — reusamos la duración que
// videoController ya extrae con music-metadata para cada archivo.
function computePosterTimestamp(durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return POSTER_TIMESTAMP_FALLBACK_SECONDS;
  const target = durationSeconds * POSTER_TIMESTAMP_FRACTION;
  // Deja al menos 0.1s de margen contra el final para no caer justo en el último frame/EOF
  return Math.min(target, Math.max(durationSeconds - 0.1, 0));
}

function isFfmpegAvailable() {
  return !!ffmpegPath;
}

function markerPath(itemRelativePath) {
  return path.join(CACHE_DIR, `${itemRelativePath}.json`);
}

function posterAbsolutePath(videoBaseDir, itemRelativePath) {
  return path.join(videoBaseDir, POSTER_DIR_NAME, `${itemRelativePath}.jpg`);
}

function posterUrlFor(itemRelativePath) {
  return `/videos/${POSTER_DIR_NAME}/${itemRelativePath.replace(/\\/g, "/")}.jpg`;
}

function readMarker(itemRelativePath) {
  try {
    return JSON.parse(fs.readFileSync(markerPath(itemRelativePath), "utf8"));
  } catch (e) {
    return null;
  }
}

function writeMarker(itemRelativePath, data) {
  const p = markerPath(itemRelativePath);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data));
}

// Espacio libre disponible en el disco que contiene targetPath (en bytes). Best-effort: si `df` falla (p.ej. Windows), asume que hay espacio.
async function getAvailableDiskSpace(targetPath) {
  return new Promise((resolve) => {
    exec(`df -Pk "${targetPath}"`, (error, stdout) => {
      if (error) return resolve(Number.MAX_SAFE_INTEGER);
      try {
        const lines = stdout.trim().split("\n");
        if (lines.length < 2) return resolve(Number.MAX_SAFE_INTEGER);
        const parts = lines[1].split(/\s+/);
        resolve(parseInt(parts[3], 10) * 1024);
      } catch (e) {
        resolve(Number.MAX_SAFE_INTEGER);
      }
    });
  });
}

function generatePoster(itemPath, outputPath, durationSeconds) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const command = ffmpeg(itemPath);
    const timeout = setTimeout(() => {
      command.kill("SIGKILL");
      reject(new Error("Tiempo de espera agotado generando póster"));
    }, FFMPEG_TIMEOUT_MS);

    command
      .on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .on("end", () => {
        clearTimeout(timeout);
        // ffmpeg puede terminar con código 0 sin haber escrito el frame (p.ej. si el
        // timestamp pedido cae fuera de la duración real del video); no confiar solo en el evento.
        if (!fs.existsSync(outputPath)) {
          reject(new Error("ffmpeg terminó sin errores pero no generó el archivo de póster"));
          return;
        }
        resolve();
      })
      .screenshots({
        timestamps: [computePosterTimestamp(durationSeconds)],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "480x?",
      });
  });
}

// Remux con -movflags +faststart (copia de streams, sin recodificar). Escribe a un archivo
// temporal junto al original y solo reemplaza el original si ffmpeg termina sin errores,
// para que un fallo a mitad de proceso nunca deje el video original corrupto o a medias.
async function applyFaststart(itemPath) {
  const availableSpace = await getAvailableDiskSpace(path.dirname(itemPath));
  const stats = fs.statSync(itemPath);
  if (availableSpace < stats.size * 1.5) {
    throw new Error("Espacio en disco insuficiente para remuxear con faststart");
  }

  // ffmpeg elige el muxer de salida a partir de la extensión del archivo: debe terminar en
  // ".mp4" (no ".tmp") o falla con "Invalid argument" al no poder detectar el formato.
  const parsed = path.parse(itemPath);
  const tempPath = path.join(parsed.dir, `${parsed.name}.faststart.tmp${parsed.ext}`);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(itemPath);
    const timeout = setTimeout(() => {
      command.kill("SIGKILL");
      reject(new Error("Tiempo de espera agotado aplicando faststart"));
    }, FFMPEG_TIMEOUT_MS);

    command
      .outputOptions(["-c", "copy", "-movflags", "+faststart"])
      .on("error", (err) => {
        clearTimeout(timeout);
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
            /* best-effort cleanup */
          }
        }
        reject(err);
      })
      .on("end", () => {
        clearTimeout(timeout);
        try {
          fs.renameSync(tempPath, itemPath);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .save(tempPath);
  });
}

// Procesa un solo video: genera su póster si falta y aplica faststart si aún no se ha
// aplicado. Usa un marker (mtime + size) para no reprocesar en cada arranque del servidor.
async function processVideo(videoBaseDir, itemPath, itemRelativePath, durationSeconds) {
  if (!isFfmpegAvailable()) {
    return { posterUrl: null };
  }

  const stats = fs.statSync(itemPath);
  const marker = readMarker(itemRelativePath);
  const outputPosterPath = posterAbsolutePath(videoBaseDir, itemRelativePath);
  const isUpToDate = !!marker && marker.mtimeMs === stats.mtimeMs && marker.size === stats.size;

  let posterOk = isUpToDate && marker.posterOk && fs.existsSync(outputPosterPath);
  if (!posterOk) {
    try {
      await generatePoster(itemPath, outputPosterPath, durationSeconds);
      posterOk = true;
    } catch (err) {
      console.warn(`[videoProcessingService] No se pudo generar póster para ${itemRelativePath}:`, err.message);
      posterOk = false;
    }
  }

  let faststartOk = isUpToDate && marker.faststartOk;
  if (!faststartOk) {
    try {
      await applyFaststart(itemPath);
      faststartOk = true;
    } catch (err) {
      console.warn(`[videoProcessingService] No se pudo aplicar faststart a ${itemRelativePath}:`, err.message);
      faststartOk = false;
    }
  }

  // El remux puede cambiar tamaño (índice reordenado); volvemos a leer mtime/size para el marker
  const finalStats = fs.statSync(itemPath);
  writeMarker(itemRelativePath, {
    mtimeMs: finalStats.mtimeMs,
    size: finalStats.size,
    posterOk,
    faststartOk,
  });

  return { posterUrl: posterOk ? posterUrlFor(itemRelativePath) : null };
}

// Ejecuta `worker` sobre `items` con un máximo de `limit` tareas en paralelo.
async function runWithConcurrencyLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, runNext);
  await Promise.all(workers);
  return results;
}

module.exports = {
  POSTER_DIR_NAME,
  isFfmpegAvailable,
  processVideo,
  runWithConcurrencyLimit,
  MAX_CONCURRENT_PROCESSING,
};
