const express = require('express');
const router = express.Router();
const audioDownloadController = require('../controllers/audioDownloadController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');

/**
 * Rutas para descarga de audio desde YouTube
 * Todas las rutas están protegidas con autenticación por API Key
 */

/**
 * POST /api/audio-download/download
 * Descarga audio desde YouTube y lo convierte a MP3
 * Body: { "url": "https://www.youtube.com/watch?v=XXXXX" }
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 */
router.post('/download', apiKeyAuth, audioDownloadController.downloadAudio);

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
