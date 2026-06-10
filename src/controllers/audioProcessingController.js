const audioProcessingService = require('../services/audioProcessingService');

/**
 * Inicia el procesamiento de audio (asíncrono)
 * POST /api/audio-download/process
 */
const processAudio = async (req, res) => {
  try {
    const { filename, operations } = req.body;

    console.log('[audioProcessingController] Solicitud de procesamiento recibida');
    console.log('[audioProcessingController] Archivo:', filename);
    console.log('[audioProcessingController] Operaciones:', JSON.stringify(operations));

    // Validar parámetros
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de archivo es requerido'
      });
    }

    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere al menos una operación de procesamiento'
      });
    }

    // Validar tipos de operaciones
    const validTypes = ['volume', 'split'];
    const invalidOps = operations.filter(op => !validTypes.includes(op.type));
    if (invalidOps.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Operaciones no soportadas: ${invalidOps.map(op => op.type).join(', ')}`
      });
    }

    // Iniciar procesamiento en segundo plano
    const taskId = await audioProcessingService.startProcessing(filename, operations);

    // Retornar respuesta inmediata con el ID de la tarea
    return res.status(202).json({
      success: true,
      message: 'Procesamiento iniciado en segundo plano',
      taskId: taskId,
      status: 'pending',
      statusUrl: `/api/audio-download/process-status/${taskId}`
    });
  } catch (error) {
    console.error('[audioProcessingController] Error al iniciar procesamiento:', error.message);

    if (error.message === 'El archivo de origen no existe') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor al iniciar el procesamiento',
      details: error.message
    });
  }
};

/**
 * Consulta el estado de una tarea de procesamiento
 * GET /api/audio-download/process-status/:taskId
 */
const getProcessStatus = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'El taskId es requerido'
      });
    }

    const taskStatus = audioProcessingService.getTaskStatus(taskId);

    if (!taskStatus) {
      return res.status(404).json({
        success: false,
        error: 'Tarea no encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      ...taskStatus
    });
  } catch (error) {
    console.error('[audioProcessingController] Error al obtener estado:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar el estado del procesamiento',
      details: error.message
    });
  }
};

module.exports = {
  processAudio,
  getProcessStatus
};
