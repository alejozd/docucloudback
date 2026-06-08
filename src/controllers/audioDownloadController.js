const ytDlpService = require('../services/ytDlpService');
const fs = require('fs');
const path = require('path');

/**
 * Controlador para descargar audio desde YouTube (asíncrono - no bloqueante)
 * POST /api/audio-download/download
 * 
 * Este endpoint inicia la descarga en segundo plano y retorna inmediatamente
 * con código 202 Accepted. El cliente debe hacer polling al endpoint de status
 * para verificar cuando la descarga esté completa.
 */
const downloadAudio = async (req, res) => {
  try {
    const { url } = req.body;

    console.log('[audioDownloadController] Solicitud de descarga recibida');
    console.log('[audioDownloadController] URL:', url);

    // Validar que se proporcionó una URL
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una URL de YouTube'
      });
    }

    // Validar que la URL sea de YouTube
    if (!ytDlpService.isValidYouTubeUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'URL inválida. Debe ser una URL válida de YouTube (youtube.com o youtu.be)'
      });
    }

    // Iniciar descarga en segundo plano (NO esperamos a que termine)
    console.log('[audioDownloadController] Iniciando descarga en segundo plano...');
    const taskInfo = ytDlpService.startBackgroundDownload(url);

    console.log('[audioDownloadController] Descarga iniciada, archivo esperado:', taskInfo.filename);

    // Retornar respuesta inmediata con código 202 Accepted
    return res.status(202).json({
      success: true,
      message: 'Descarga iniciada en segundo plano',
      filename: taskInfo.filename,
      status: 'downloading',
      statusUrl: `/api/audio-download/status/${encodeURIComponent(taskInfo.filename)}`,
      downloadUrl: `/api/audio-download/download/${encodeURIComponent(taskInfo.filename)}`
    });
  } catch (error) {
    console.error('[audioDownloadController] Error al iniciar descarga:', error.message);
    
    // Si es un error de validación de URL
    if (error.message.includes('URL inválida')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al iniciar la descarga',
      details: error.message
    });
  }
};

/**
 * Controlador para verificar el estado de una descarga
 * GET /api/audio-download/status/:filename
 */
const getDownloadStatus = async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log('[audioDownloadController] Verificando estado de:', filename);

    // Sanitizar nombre de archivo para evitar path traversal
    const sanitizedFilename = path.basename(filename);
    
    // Validar que el nombre no esté vacío después de sanitizar
    if (!sanitizedFilename) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo inválido'
      });
    }

    // Obtener estado desde el servicio
    const statusInfo = ytDlpService.getDownloadStatus(sanitizedFilename);

    console.log('[audioDownloadController] Estado obtenido:', statusInfo.status);

    return res.status(200).json({
      success: true,
      ...statusInfo
    });
  } catch (error) {
    console.error('[audioDownloadController] Error al obtener estado:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar el estado de la descarga',
      details: error.message
    });
  }
};

/**
 * Controlador para listar archivos MP3 descargados
 * GET /api/audio-download/files
 */
const listFiles = async (req, res) => {
  try {
    const downloadPath = ytDlpService.getDownloadPath();
    
    console.log('[audioDownloadController] Listando archivos en:', downloadPath);

    // Verificar si el directorio existe
    if (!fs.existsSync(downloadPath)) {
      console.log('[audioDownloadController] Directorio no existe, creando...');
      ytDlpService.ensureDownloadDirectory();
      return res.status(200).json({
        success: true,
        files: [],
        message: 'No hay archivos descargados aún'
      });
    }

    // Leer archivos del directorio
    const files = fs.readdirSync(downloadPath)
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const filePath = path.join(downloadPath, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          downloadUrl: `/api/audio-download/download/${encodeURIComponent(file)}`
        };
      })
      .sort((a, b) => b.modifiedAt - a.modifiedAt); // Ordenar por más reciente primero

    console.log(`[audioDownloadController] ${files.length} archivos encontrados`);

    return res.status(200).json({
      success: true,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('[audioDownloadController] Error al listar archivos:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al listar los archivos',
      details: error.message
    });
  }
};

/**
 * Controlador para descargar un archivo MP3 específico
 * GET /api/audio-download/download/:filename
 */
const getFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log('[audioDownloadController] Solicitud de archivo:', filename);

    // Sanitizar nombre de archivo para evitar path traversal
    const sanitizedFilename = path.basename(filename);
    
    // Validar que el nombre no esté vacío después de sanitizar
    if (!sanitizedFilename) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo inválido'
      });
    }

    const downloadPath = ytDlpService.getDownloadPath();
    const filePath = path.join(downloadPath, sanitizedFilename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.log('[audioDownloadController] Archivo no encontrado:', filePath);
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    // Verificar que es un archivo (no directorio)
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({
        success: false,
        error: 'El recurso especificado no es un archivo válido'
      });
    }

    console.log('[audioDownloadController] Enviando archivo:', filePath);

    // Enviar archivo para descarga
    res.download(filePath, sanitizedFilename, (err) => {
      if (err) {
        console.error('[audioDownloadController] Error al enviar archivo:', err.message);
        // Si ya se enviaron headers, no podemos enviar JSON
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            error: 'Error al descargar el archivo'
          });
        }
      }
    });
  } catch (error) {
    console.error('[audioDownloadController] Error al obtener archivo:', error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Error interno al procesar la solicitud',
        details: error.message
      });
    }
  }
};

/**
 * Controlador para eliminar un archivo MP3
 * DELETE /api/audio-download/delete/:filename
 */
const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;
    
    console.log('[audioDownloadController] Solicitud de eliminación:', filename);

    // Sanitizar nombre de archivo para evitar path traversal
    const sanitizedFilename = path.basename(filename);
    
    // Validar que el nombre no esté vacío después de sanitizar
    if (!sanitizedFilename) {
      return res.status(400).json({
        success: false,
        error: 'Nombre de archivo inválido'
      });
    }

    const downloadPath = ytDlpService.getDownloadPath();
    const filePath = path.join(downloadPath, sanitizedFilename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      console.log('[audioDownloadController] Archivo no encontrado para eliminar:', filePath);
      return res.status(404).json({
        success: false,
        error: 'Archivo no encontrado'
      });
    }

    // Eliminar archivo
    fs.unlinkSync(filePath);
    console.log('[audioDownloadController] Archivo eliminado:', filePath);

    return res.status(200).json({
      success: true,
      message: `Archivo "${sanitizedFilename}" eliminado exitosamente`
    });
  } catch (error) {
    console.error('[audioDownloadController] Error al eliminar archivo:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al eliminar el archivo',
      details: error.message
    });
  }
};

/**
 * Función auxiliar para formatear tamaño de archivo
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
  getDownloadStatus,
  listFiles,
  getFile,
  deleteFile
};
