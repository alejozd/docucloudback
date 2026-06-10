const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

// Intentar configurar ruta de ffmpeg de forma robusta
let ffmpegPath = null;

try {
  // 1. Intentar usar ffmpeg-static
  const ffmpegStatic = require('ffmpeg-static');
  if (ffmpegStatic) {
    ffmpegPath = ffmpegStatic;
    console.log('[audioProcessingService] Usando FFmpeg de ffmpeg-static:', ffmpegPath);
  }
} catch (e) {
  console.warn('[audioProcessingService] ffmpeg-static no encontrado, buscando en el sistema...');
}

if (!ffmpegPath) {
  try {
    // 2. Intentar buscar en el PATH del sistema
    const systemFfmpeg = execSync('which ffmpeg || where ffmpeg').toString().trim().split('\n')[0];
    if (systemFfmpeg) {
      ffmpegPath = systemFfmpeg;
      console.log('[audioProcessingService] Usando FFmpeg del sistema:', ffmpegPath);
    }
  } catch (e) {
    console.warn('[audioProcessingService] FFmpeg no encontrado en el PATH del sistema');
  }
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  console.error('[audioProcessingService] CRÍTICO: No se pudo encontrar FFmpeg. El procesamiento de audio no funcionará.');
}

// Directorio de descargas (mismo que ytDlpService)
const DOWNLOAD_PATH = process.env.AUDIO_DOWNLOAD_PATH || path.join(__dirname, '../../downloads/audios');

// Estado de procesamiento
const tasks = new Map();
const queue = [];
let activeTasks = 0;
const MAX_CONCURRENT_TASKS = 2;
const TASK_EXPIRY_TIME = 60 * 60 * 1000; // 1 hora
const FFMPEG_TIMEOUT = process.env.AUDIO_PROCESS_TIMEOUT || 600; // 10 minutos por defecto

/**
 * Asegura que el directorio existe
 */
function ensureDownloadDirectory() {
  if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
  }
}

/**
 * Verifica si FFmpeg está disponible
 */
function isFfmpegAvailable() {
  return !!ffmpegPath;
}

/**
 * Verifica el espacio en disco disponible en el directorio de descargas (en bytes)
 */
async function getAvailableDiskSpace() {
  return new Promise((resolve, reject) => {
    // df -Pk . devuelve el espacio en bloques de 1KB
    exec(`df -Pk "${DOWNLOAD_PATH}"`, (error, stdout) => {
      if (error) {
        // Si df falla (ej. Windows), asumimos que hay espacio o manejamos de otra forma
        console.warn('[audioProcessingService] No se pudo verificar espacio en disco con df:', error.message);
        return resolve(Number.MAX_SAFE_INTEGER);
      }

      try {
        const lines = stdout.trim().split('\n');
        if (lines.length < 2) return resolve(Number.MAX_SAFE_INTEGER);

        const parts = lines[1].split(/\s+/);
        const availableKB = parseInt(parts[3], 10);
        resolve(availableKB * 1024);
      } catch (e) {
        resolve(Number.MAX_SAFE_INTEGER);
      }
    });
  });
}

/**
 * Inicia un nuevo proceso de audio
 */
async function startProcessing(filename, operations) {
  if (!isFfmpegAvailable()) {
    throw new Error('FFmpeg no está disponible en el servidor. El procesamiento de audio no puede iniciarse.');
  }

  ensureDownloadDirectory();

  const sourcePath = path.join(DOWNLOAD_PATH, filename);
  if (!fs.existsSync(sourcePath)) {
    console.error(`[audioProcessingService] Archivo de origen no encontrado en: ${sourcePath}`);
    throw new Error('El archivo de origen no existe');
  }

  const taskId = uuidv4();
  const task = {
    id: taskId,
    originalFilename: filename,
    operations: operations,
    status: 'pending',
    progress: 0,
    generatedFiles: [],
    error: null,
    createdAt: new Date()
  };

  tasks.set(taskId, task);
  queue.push(taskId);

  // Procesar cola de forma asíncrona
  processQueue();

  // Limpiar tareas antiguas periódicamente
  cleanupOldTasks();

  return taskId;
}

/**
 * Procesa la cola de tareas respetando el límite de concurrencia
 */
async function processQueue() {
  if (activeTasks >= MAX_CONCURRENT_TASKS || queue.length === 0) {
    return;
  }

  const taskId = queue.shift();
  const task = tasks.get(taskId);

  if (!task) return processQueue();

  activeTasks++;
  task.status = 'processing';
  task.startedAt = new Date();

  try {
    await runProcessingTask(task);
    task.status = 'completed';
    task.completedAt = new Date();
    task.progress = 100;
  } catch (error) {
    console.error(`[audioProcessingService] Error en tarea ${taskId}:`, error.message);
    task.status = 'failed';
    task.error = error.message;
    // Limpiar archivos parciales si falló
    cleanupFailedTask(task);
  } finally {
    activeTasks--;
    processQueue();
  }
}

/**
 * Ejecuta las operaciones de FFmpeg para una tarea
 */
async function runProcessingTask(task) {
  const sourcePath = path.join(DOWNLOAD_PATH, task.originalFilename);
  const stats = fs.statSync(sourcePath);

  // Verificar espacio en disco (requerimos al menos 3 veces el tamaño del archivo original)
  const availableSpace = await getAvailableDiskSpace();
  if (availableSpace < stats.size * 3) {
    throw new Error('Espacio en disco insuficiente para procesar el audio');
  }

  // Analizar operaciones
  const volOp = task.operations.find(op => op.type === 'volume');
  const splitOp = task.operations.find(op => op.type === 'split');

  let currentInput = sourcePath;
  // Usar los primeros 8 caracteres del taskId para asegurar nombres únicos pero legibles
  const taskPrefix = task.id.substring(0, 8);
  let baseName = task.originalFilename.replace(/\.[^/.]+$/, "");

  // 1. Aplicar Volumen si existe
  if (volOp) {
    const level = parseFloat(volOp.level) || 0;
    const outputFilename = `${baseName}_${taskPrefix}_vol+${level}db.mp3`;
    const outputPath = path.join(DOWNLOAD_PATH, outputFilename);

    await applyVolume(currentInput, outputPath, level, task);

    task.generatedFiles.push(outputFilename);
    const prevInput = currentInput;
    currentInput = outputPath;
    baseName = outputFilename.replace(/\.[^/.]+$/, "");

    // Si el anterior input no es el archivo original, es un archivo intermedio y podemos borrarlo
    if (prevInput !== sourcePath && fs.existsSync(prevInput)) {
       try { fs.unlinkSync(prevInput); } catch(e) {}
    }
  }

  // 2. Aplicar Split si existe
  if (splitOp) {
    const intervalMinutes = parseInt(splitOp.interval) || 30;
    const intervalSeconds = intervalMinutes * 60;

    // El output pattern para segment
    const segmentBaseName = `${baseName}_${taskPrefix}`;
    const outputPattern = path.join(DOWNLOAD_PATH, `${segmentBaseName}_parte%d.mp3`);

    const parts = await splitAudio(currentInput, outputPattern, intervalSeconds, task, segmentBaseName);

    task.generatedFiles.push(...parts);
  } else if (!volOp) {
     throw new Error('No se especificaron operaciones válidas');
  }
}

/**
 * Aplica ganancia de volumen
 */
function applyVolume(input, output, level, task) {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(input);

    // Timeout manual
    const timeout = setTimeout(() => {
      command.kill('SIGKILL');
      reject(new Error('Tiempo de espera agotado en operación de volumen'));
    }, parseInt(FFMPEG_TIMEOUT) * 1000);

    command
      .audioFilters(`volume=${level}dB`)
      .on('progress', (progress) => {
        if (!progress.percent) return;
        // Si hay split después, el volumen es solo una parte del progreso total
        const hasSplit = task.operations.some(op => op.type === 'split');
        task.progress = hasSplit ? Math.round(progress.percent / 2) : Math.round(progress.percent);
        tasks.set(task.id, { ...task });
      })
      .on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .on('end', () => {
        clearTimeout(timeout);
        resolve();
      })
      .save(output);
  });
}

/**
 * Divide el audio en segmentos
 */
function splitAudio(input, outputPattern, intervalSeconds, task, baseName) {
  return new Promise((resolve, reject) => {
    const hasVolume = task.operations.some(op => op.type === 'volume');

    const command = ffmpeg(input);

    // Timeout manual
    const timeout = setTimeout(() => {
      command.kill('SIGKILL');
      reject(new Error('Tiempo de espera agotado en operación de división'));
    }, parseInt(FFMPEG_TIMEOUT) * 1000);

    command
      .outputOptions([
        '-f', 'segment',
        '-segment_time', intervalSeconds.toString(),
        '-segment_start_number', '1',
        '-c', 'copy'
      ])
      .on('progress', (progress) => {
        if (!progress.percent) return;
        const baseProgress = hasVolume ? 50 : 0;
        const currentProgress = Math.round(progress.percent / (hasVolume ? 2 : 1));
        task.progress = baseProgress + currentProgress;
        tasks.set(task.id, { ...task });
      })
      .on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      })
      .on('end', () => {
        clearTimeout(timeout);
        // Buscar archivos generados
        const baseSearchPattern = `${baseName}_parte`;
        const files = fs.readdirSync(DOWNLOAD_PATH)
          .filter(f => f.startsWith(baseSearchPattern) && f.endsWith('.mp3'))
          .sort((a, b) => {
             const numA = parseInt(a.match(/parte(\d+)/)?.[1] || 0);
             const numB = parseInt(b.match(/parte(\d+)/)?.[1] || 0);
             return numA - numB;
          });
        resolve(files);
      })
      .save(outputPattern);
  });
}

/**
 * Limpia tareas antiguas del Mapa para evitar fugas de memoria
 */
function cleanupOldTasks() {
  const now = Date.now();
  for (const [taskId, task] of tasks.entries()) {
    if (task.status === 'completed' || task.status === 'failed') {
      const finishedAt = task.completedAt || task.failedAt || task.createdAt;
      if (now - new Date(finishedAt).getTime() > TASK_EXPIRY_TIME) {
        tasks.delete(taskId);
        console.log(`[audioProcessingService] Tarea expirada eliminada: ${taskId}`);
      }
    }
  }
}

/**
 * Limpia archivos generados si la tarea falla
 */
function cleanupFailedTask(task) {
  if (task.generatedFiles && task.generatedFiles.length > 0) {
    task.generatedFiles.forEach(file => {
      const filePath = path.join(DOWNLOAD_PATH, file);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    });
  }
}

/**
 * Obtiene el estado de una tarea
 */
function getTaskStatus(taskId) {
  return tasks.get(taskId);
}

module.exports = {
  startProcessing,
  getTaskStatus,
  isFfmpegAvailable
};
