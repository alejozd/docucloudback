const express = require('express');
const router = express.Router();
const audioDownloadController = require('../controllers/audioDownloadController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

/**
 * Rutas para descarga de audio desde YouTube
 * Todas las rutas están protegidas con autenticación por API Key
 * 
 * Flujo de uso:
 * 1. POST /download - Inicia descarga, retorna 202 con filename
 * 2. GET /status/:filename - Verifica estado (polling cada 5 segundos)
 * 3. GET /download/:filename - Descarga el archivo cuando status = completed
 */

/**
 * POST /api/audio-download/download
 * Inicia descarga de audio desde YouTube en segundo plano
 * Body: { "url": "https://www.youtube.com/watch?v=XXXXX" }
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 * Retorna: 202 Accepted con filename y URLs de status/download
 */
router.post('/download', apiKeyAuth, audioDownloadController.downloadAudio);

/**
 * GET /api/audio-download/status/:filename
 * Verifica el estado de una descarga en curso
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 * Retorna: { status: "downloading" | "completed" | "failed" | "not_found", filename, size, progress }
 */
router.get('/status/:filename', apiKeyAuth, audioDownloadController.getDownloadStatus);

/**
 * GET /api/audio-download/files
 * Lista todos los archivos MP3 descargados
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 */
router.get('/files', apiKeyAuth, audioDownloadController.listFiles);

/**
 * GET /api/audio-download/download/:filename
 * Descarga un archivo MP3 específico
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 */
router.get('/download/:filename', apiKeyAuth, audioDownloadController.getFile);

/**
 * DELETE /api/audio-download/delete/:filename
 * Elimina un archivo MP3 específico
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 */
router.delete('/delete/:filename', apiKeyAuth, audioDownloadController.deleteFile);

module.exports = router;
