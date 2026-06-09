const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Obtener ruta de descargas desde variable de entorno o usar default
const DOWNLOAD_PATH = process.env.AUDIO_DOWNLOAD_PATH || path.join(__dirname, '../../downloads/audios');

// Almacenar estado de las descargas en curso
const downloadStatus = new Map();

/**
 * Asegura que la carpeta de descargas exista
 */
function ensureDownloadDirectory() {
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
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
 * Obtiene metadatos del video (título, duración, thumbnail) sin descargarlo
 * @param {string} url - URL del video de YouTube
 * @returns {Promise<{title: string, duration: number, thumbnail: string|null}>}
 */
async function getVideoMetadata(url) {
  return new Promise((resolve, reject) => {
    const command = `yt-dlp --print title --print duration --print thumbnail --no-download "${url}"`;
    
    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error obteniendo metadatos: ${stderr}`));
        return;
      }
      
      const lines = stdout.trim().split('\n');
      resolve({
        title: lines[0] || 'Video sin título',
        duration: parseInt(lines[1]) || 0,
        thumbnail: lines[2] || null
      });
    });
  });
}

/**
 * Sanitiza el nombre de archivo para evitar inyección de comandos
 * @param {string} title - Título original del video
 * @returns {string} - Nombre sanitizado
 */
function sanitizeFilename(title) {
  if (!title) return 'unknown_audio';
  
  // Eliminar caracteres no permitidos en nombres de archivo
  let sanitized = title
    .replace(/[<>:"/\\|?*]/g, '')  // Eliminar caracteres especiales peligrosos
    .replace(/\s+/g, '_')           // Reemplazar espacios con guiones bajos
    .replace(/[^\w\-_.]/g, '')      // Solo caracteres alfanuméricos, guiones, puntos y guiones bajos
    .substring(0, 100)              // Limitar a 100 caracteres
    .trim();
  
  return sanitized || 'unknown_audio';
}

/**
 * Sanitiza el nombre de archivo para evitar inyección de comandos (versión legacy)
 * @param {string} filename - Nombre original del archivo
 * @returns {string} - Nombre sanitizado
 */
function sanitizeFilenameLegacy(filename) {
  if (!filename) return 'unknown_audio';
  
  // Eliminar caracteres peligrosos y limitar longitud
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '') // Eliminar caracteres especiales peligrosos
    .replace(/\s+/g, '_')         // Reemplazar espacios con guiones bajos
    .substring(0, 100);           // Limitar a 100 caracteres
  
  return sanitized || 'unknown_audio';
}

/**
 * Extrae el ID del video de una URL de YouTube
 * @param {string} url - URL del video de YouTube
 * @returns {string|null} - ID del video o null si no se pudo extraer
 */
function extractVideoId(url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Genera un nombre de archivo seguro basado en la URL
 * @param {string} url - URL del video
 * @returns {string} - Nombre de archivo generado
 */
function generateFilenameFromUrl(url) {
  try {
    // Extraer ID del video de YouTube usando la función extractVideoId
    const videoId = extractVideoId(url);
    
    if (videoId) {
      return `video_${videoId}.mp3`;
    }
  } catch (e) {
    // Si falla el parseo, usar timestamp
  }
  
  // Fallback: usar timestamp único
  return `audio_${Date.now()}.mp3`;
}

/**
 * Ejecuta yt-dlp para descargar y convertir audio a MP3 (versión síncrona)
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

    // Ejecutar yt-dlp usando spawn para mejor manejo de procesos largos
    const ytDlpProcess = spawn('yt-dlp', args);

    let stdoutData = '';
    let stderrData = '';

    ytDlpProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    ytDlpProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ytDlpProcess.on('close', (code) => {
      if (code === 0) {
        // Descarga exitosa - buscar el archivo generado
        
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
  });
}

/**
 * Inicia una descarga de audio en segundo plano (sin esperar)
 * @param {string} url - URL del video de YouTube
 * @returns {Promise<{filename: string, expectedPath: string, title: string}>} - Información de la tarea iniciada
 */
async function startBackgroundDownload(url) {
  // Validar URL primero
  if (!isValidYouTubeUrl(url)) {
    throw new Error('URL inválida. Debe ser una URL de YouTube (youtube.com o youtu.be)');
  }

  // Asegurar que el directorio existe
  ensureDownloadDirectory();

  // Extraer ID del video
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('No se pudo extraer el ID del video');
  }
  
  // Obtener metadatos del video
  let metadata;
  try {
    metadata = await getVideoMetadata(url);
  } catch (error) {
    metadata = {
      title: `video_${videoId}`,
      duration: 0,
      thumbnail: null
    };
  }
  
  // Generar nombre de archivo con título sanitizado + ID
  const sanitizedTitle = sanitizeFilename(metadata.title);
  const expectedFilename = `${sanitizedTitle}_${videoId}.mp3`;
  const expectedPath = path.join(DOWNLOAD_PATH, expectedFilename);

  // Registrar estado inicial con título original
  downloadStatus.set(expectedFilename, {
    id: videoId,
    url: url,
    title: metadata.title,
    filename: expectedFilename,
    status: 'downloading',
    progress: 0,
    error: null,
    createdAt: new Date()
  });

  // Template de salida con título sanitizado + ID para nombre predecible
  const outputTemplate = path.join(DOWNLOAD_PATH, `${sanitizedTitle}_${videoId}.%(ext)s`);

  // Argumentos de yt-dlp
  const args = [
    '-x',                        // Extraer audio
    '--audio-format', 'mp3',     // Convertir a MP3
    '--audio-quality', '0',      // Máxima calidad
    '-o', outputTemplate,        // Template de salida
    url                         // URL del video
  ];

  console.log(`[ytDlpService] Descarga iniciada: ID=${videoId}, URL=${url}`);

  // Ejecutar yt-dlp usando spawn (NO esperamos el resultado)
  const ytDlpProcess = spawn('yt-dlp', args);

  let stderrData = '';

  ytDlpProcess.stdout.on('data', (data) => {
    const chunk = data.toString();
    
    // Intentar extraer progreso del output
    const progressMatch = chunk.match(/\[download\]\s+(\d+\.?\d*)%/);
    if (progressMatch) {
      const currentStatus = downloadStatus.get(expectedFilename);
      if (currentStatus) {
        currentStatus.progress = parseFloat(progressMatch[1]);
        downloadStatus.set(expectedFilename, currentStatus);
      }
    }
  });

  ytDlpProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  ytDlpProcess.on('close', (code) => {
    const currentStatus = downloadStatus.get(expectedFilename);
    
    if (code === 0) {
      // Verificar si el archivo con nombre predecible existe
      const predictedFilePath = path.join(DOWNLOAD_PATH, expectedFilename);
      
      if (fs.existsSync(predictedFilePath)) {
        try {
          const stats = fs.statSync(predictedFilePath);
          console.log(`[ytDlpService] Descarga completada: ${expectedFilename}`);
          
          // Actualizar estado con el nombre predecible del archivo
          downloadStatus.set(expectedFilename, {
            status: 'completed',
            url: url,
            startedAt: currentStatus?.startedAt || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            progress: 100,
            filename: expectedFilename,
            size: stats.size
          });
        } catch (err) {
          console.error('[ytDlpService] [BG] Error al leer archivo:', err.message);
          if (currentStatus) {
            currentStatus.status = 'failed';
            currentStatus.error = 'Error al leer información del archivo';
            downloadStatus.set(expectedFilename, currentStatus);
          }
        }
      } else {
        // Fallback: buscar el archivo MP3 más reciente por si acaso
        try {
          const files = fs.readdirSync(DOWNLOAD_PATH)
            .filter(file => file.endsWith('.mp3'))
            .map(file => ({
              name: file,
              path: path.join(DOWNLOAD_PATH, file),
              stats: fs.statSync(path.join(DOWNLOAD_PATH, file))
            }))
            .sort((a, b) => b.stats.mtime - a.stats.mtime);

          if (files.length > 0) {
            const actualFile = files[0];
            console.log(`[ytDlpService] Descarga completada: ${actualFile.name}`);
            
            // Actualizar estado con el nombre real del archivo
            downloadStatus.set(actualFile.name, {
              status: 'completed',
              url: url,
              startedAt: currentStatus?.startedAt || new Date().toISOString(),
              completedAt: new Date().toISOString(),
              progress: 100,
              filename: actualFile.name,
              size: actualFile.stats.size
            });
            
            // Si el nombre es diferente al esperado, también actualizar esa entrada
            if (actualFile.name !== expectedFilename && currentStatus) {
              currentStatus.status = 'completed';
              currentStatus.completedAt = new Date().toISOString();
              currentStatus.actualFilename = actualFile.name;
              downloadStatus.set(expectedFilename, currentStatus);
            }
          }
        } catch (err) {
          console.error('[ytDlpService] [BG] Error al buscar archivo:', err.message);
          if (currentStatus) {
            currentStatus.status = 'failed';
            currentStatus.error = 'Archivo no encontrado después de la descarga';
            downloadStatus.set(expectedFilename, currentStatus);
          }
        }
      }
    } else {
      // Error en la descarga
      console.error(`[ytDlpService] Error en descarga: código de salida: ${code}`);
      if (currentStatus) {
        currentStatus.status = 'failed';
        currentStatus.error = stderrData || 'Código de error desconocido';
        downloadStatus.set(expectedFilename, currentStatus);
      }
    }
  });

  ytDlpProcess.on('error', (err) => {
    console.error('[ytDlpService] Error en descarga:', err.message);
    const currentStatus = downloadStatus.get(expectedFilename);
    if (currentStatus) {
      currentStatus.status = 'failed';
      currentStatus.error = err.code === 'ENOENT' 
        ? 'yt-dlp no está instalado' 
        : err.message;
      downloadStatus.set(expectedFilename, currentStatus);
    }
  });

  return {
    filename: expectedFilename,
    expectedPath: expectedPath,
    title: metadata.title
  };
}

/**
 * Obtiene el estado de una descarga
 * @param {string} filename - Nombre del archivo a verificar
 * @returns {{status: string, filename: string, size?: number, error?: string, title?: string}}
 */
function getDownloadStatus(filename) {
  // Verificar en el mapa de estados primero
  const statusInfo = downloadStatus.get(filename);
  
  if (statusInfo) {
    return {
      status: statusInfo.status,
      filename: statusInfo.actualFilename || filename,
      size: statusInfo.size,
      progress: statusInfo.progress,
      startedAt: statusInfo.startedAt,
      completedAt: statusInfo.completedAt,
      error: statusInfo.error,
      title: statusInfo.title
    };
  }
  
  // Si no está en el mapa, verificar si el archivo existe con el nombre solicitado
  let filePath = path.join(DOWNLOAD_PATH, filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      
      // Extraer título del filename (formato: <titulo_sanitizado>_<videoId>.mp3)
      const match = filename.match(/_([a-zA-Z0-9_-]{11})\.mp3$/);
      const videoId = match ? match[1] : null;
      const title = videoId 
        ? filename.replace(`_${videoId}.mp3`, '').replace(/_/g, ' ')
        : filename.replace('.mp3', '').replace(/_/g, ' ');
      
      return {
        status: 'completed',
        filename: filename,
        title: title,
        size: stats.size,
        sizeFormatted: formatFileSize(stats.size),
        modifiedAt: stats.mtime.toISOString()
      };
    } catch (err) {
      return {
        status: 'failed',
        filename: filename,
        error: 'Error al leer información del archivo'
      };
    }
  }
  
  // Si el archivo no existe con ese nombre, intentar extraer el ID del video
  // y buscar con el formato predecible video_<ID>.mp3
  const videoIdMatch = filename.match(/video_(.*)\.mp3$/);
  if (videoIdMatch && videoIdMatch[1]) {
    const predictedPath = path.join(DOWNLOAD_PATH, `video_${videoIdMatch[1]}.mp3`);
    if (fs.existsSync(predictedPath)) {
      try {
        const stats = fs.statSync(predictedPath);
        return {
          status: 'completed',
          filename: `video_${videoIdMatch[1]}.mp3`,
          title: `video_${videoIdMatch[1]}`,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modifiedAt: stats.mtime.toISOString()
        };
      } catch (err) {
        return {
          status: 'failed',
          filename: filename,
          error: 'Error al leer información del archivo'
        };
      }
    }
  }
  
  // Archivo no encontrado
  return {
    status: 'not_found',
    filename: filename
  };
}

/**
 * Formatea el tamaño de archivo en formato legible
 * @param {number} bytes - Tamaño en bytes
 * @returns {string} - Tamaño formateado
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  downloadAudio,
  startBackgroundDownload,
  getDownloadStatus,
  getVideoMetadata,
  isValidYouTubeUrl,
  sanitizeFilename,
  sanitizeFilenameLegacy,
  generateFilenameFromUrl,
  extractVideoId,
  getDownloadPath: () => DOWNLOAD_PATH,
  ensureDownloadDirectory
};
