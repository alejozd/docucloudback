const express = require('express');
const router = express.Router();
const audioDownloadController = require('../controllers/audioDownloadController');
const { authenticateToken } = require('../middlewares/authMiddleware');

/**
 * Rutas para descarga de audio desde YouTube
 * Todas las rutas están protegidas con autenticación JWT
 */

/**
 * POST /api/audio-download/download
 * Descarga audio desde YouTube y lo convierte a MP3
 * Body: { "url": "https://www.youtube.com/watch?v=XXXXX" }
 */
router.post('/download', authenticateToken, audioDownloadController.downloadAudio);

/**
 * GET /api/audio-download/files
 * Lista todos los archivos MP3 descargados
 */
router.get('/files', authenticateToken, audioDownloadController.listFiles);

/**
 * GET /api/audio-download/download/:filename
 * Descarga un archivo MP3 específico
 */
router.get('/download/:filename', authenticateToken, audioDownloadController.getFile);

/**
 * DELETE /api/audio-download/delete/:filename
 * Elimina un archivo MP3 específico
 */
router.delete('/delete/:filename', authenticateToken, audioDownloadController.deleteFile);

module.exports = router;
