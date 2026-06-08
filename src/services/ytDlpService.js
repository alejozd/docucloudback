const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Obtener ruta de descargas desde variable de entorno o usar default
const DOWNLOAD_PATH = process.env.AUDIO_DOWNLOAD_PATH || path.join(__dirname, '../../downloads/audios');

/**
 * Asegura que la carpeta de descargas exista
 */
function ensureDownloadDirectory() {
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    console.log(`[ytDlpService] Carpeta de descargas creada: ${DOWNLOAD_PATH}`);
  }
}

/**
 * Valida que la URL sea de YouTube
 * @param {string} url - URL a validar
 * @returns {boolean} - True si es URL válida de YouTube
 */
function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  // Patrones válidos: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, etc.
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;
  return youtubeRegex.test(url);
}

/**
 * Sanitiza el nombre de archivo para evitar inyección de comandos
 * @param {string} filename - Nombre original del archivo
 * @returns {string} - Nombre sanitizado
 */
function sanitizeFilename(filename) {
  if (!filename) return 'unknown_audio';
  
  // Eliminar caracteres peligrosos y limitar longitud
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres especiales peligrosos
    .replace(/\s+/g, '_')         // Reemplazar espacios con guiones bajos
    .substring(0, 100);           // Limitar a 100 caracteres
  
  return sanitized || 'unknown_audio';
}

/**
 * Ejecuta yt-dlp para descargar y convertir audio a MP3
 * @param {string} url - URL del video de YouTube
 * @returns {Promise<{success: boolean, filename?: string, error?: string}>}
 */
function downloadAudio(url) {
  return new Promise((resolve, reject) => {
    // Validar URL primero
    if (!isValidYouTubeUrl(url)) {
      return resolve({
        success: false,
        error: 'URL inválida. Debe ser una URL de YouTube (youtube.com o youtu.be)'
      });
    }

    // Asegurar que el directorio existe
    ensureDownloadDirectory();

    // Template de salida con nombre sanitizado
    const outputTemplate = path.join(DOWNLOAD_PATH, '%(title)s.%(ext)s');

    // Argumentos de yt-dlp
    const args = [
      '-x',                        // Extraer audio
      '--audio-format', 'mp3',     // Convertir a MP3
      '--audio-quality', '0',      // Máxima calidad
      '-o', outputTemplate,        // Template de salida
      url                         // URL del video
    ];

    console.log(`[ytDlpService] Iniciando descarga de audio: ${url}`);
    console.log(`[ytDlpService] Ruta de destino: ${DOWNLOAD_PATH}`);

    // Ejecutar yt-dlp usando spawn para mejor manejo de procesos largos
    const ytDlpProcess = spawn('yt-dlp', args);

    let stdoutData = '';
    let stderrData = '';

    ytDlpProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdoutData += chunk;
      console.log(`[ytDlpService] STDOUT: ${chunk.trim()}`);
    });

    ytDlpProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrData += chunk;
      console.log(`[ytDlpService] STDERR: ${chunk.trim()}`);
    });

    ytDlpProcess.on('close', (code) => {
      if (code === 0) {
        // Descarga exitosa - buscar el archivo generado
        console.log(`[ytDlpService] Descarga completada con código: ${code}`);
        
        // Buscar el archivo MP3 más reciente en la carpeta
        try {
          const files = fs.readdirSync(DOWNLOAD_PATH)
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
              name: file,
              path: path.join(DOWNLOAD_PATH, file),
              stats: fs.statSync(path.join(DOWNLOAD_PATH, file))
            }))
            .sort((a, b) => b.stats.mtime - a.stats.mtime); // Ordenar por fecha (más reciente primero)

          if (files.length > 0) {
            const latestFile = files[0];
            console.log(`[ytDlpService] Archivo generado: ${latestFile.name}`);
            resolve({
              success: true,
              filename: latestFile.name,
              path: latestFile.path,
              message: 'Audio descargado y convertido exitosamente'
            });
          } else {
            resolve({
              success: false,
              error: 'No se pudo encontrar el archivo MP3 generado'
            });
          }
        } catch (err) {
          console.error('[ytDlpService] Error al buscar archivo:', err.message);
          resolve({
            success: false,
            error: 'Descarga completada pero error al localizar el archivo'
          });
        }
      } else {
        // Error en la descarga
        console.error(`[ytDlpService] Error en yt-dlp, código de salida: ${code}`);
        resolve({
          success: false,
          error: `Error al descargar audio: ${stderrData || 'Código de error desconocido'}`
        });
      }
    });

    ytDlpProcess.on('error', (err) => {
      console.error('[ytDlpService] Error al ejecutar yt-dlp:', err.message);
      if (err.code === 'ENOENT') {
        resolve({
          success: false,
          error: 'yt-dlp no está instalado en el servidor. Instálelo con: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp'
        });
      } else {
        resolve({
          success: false,
          error: `Error al ejecutar yt-dlp: ${err.message}`
        });
      }
    });

    // Timeout de 5 minutos para evitar procesos colgados
    setTimeout(() => {
      ytDlpProcess.kill('SIGTERM');
      resolve({
        success: false,
        error: 'Tiempo de espera agotado. La descarga tomó demasiado tiempo.'
      });
    }, 5 * 60 * 1000); // 5 minutos
  });
}

module.exports = {
  downloadAudio,
  isValidYouTubeUrl,
  sanitizeFilename,
  getDownloadPath: () => DOWNLOAD_PATH,
  ensureDownloadDirectory
};
