const express = require('express');
const router = express.Router();
const audioDownloadController = require('../controllers/audioDownloadController');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const tempTokenService = require('../services/tempTokenService');
const fs = require('fs');
const path = require('path');

/**
 * Rutas para descarga de audio desde YouTube
 * Todas las rutas están protegidas con autenticación por API Key
 * EXCEPTO: /stream/:filename que usa tokens temporales
 * 
 * Flujo de uso con tokens temporales:
 * 1. POST /generate-token - Genera token temporal (requiere API Key)
 * 2. GET /stream/:filename?token=XXX - Streaming sin API Key (usa token)
 */

/**
 * GET /api/audio-download/stream/:filename
 * Streaming de audio con token temporal (SIN API Key requerida)
 * Query params requeridos: token=<token-temporal>
 * Este endpoint debe ir ANTES del middleware apiKeyAuth
 */
router.get('/stream/:filename', (req, res) => {
  const { filename } = req.params;
  const { token } = req.query;
  
  console.log('[stream] === DEBUG ===');
  console.log('[stream] Filename:', filename);
  console.log('[stream] Token:', token ? token.substring(0, 10) + '...' : 'NINGUNO');
  
  if (!token) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Token requerido' 
    });
  }
  
  const tokenData = tempTokenService.validateToken(token);
  
  if (!tokenData) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Token inválido, expirado o ya usado' 
    });
  }
  
  if (tokenData.filename !== filename) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Token no corresponde a este archivo' 
    });
  }
  
  console.log('[stream] ✅ Token válido, procediendo con streaming');
  
  // Reutilizar la lógica de streaming
  req.params.filename = filename;
  audioDownloadController.getFile(req, res);
});

/**
 * POST /api/audio-download/generate-token
 * Genera un token temporal para streaming de audio
 * Body: { "filename": "archivo.mp3" }
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 * Retorna: { ok: true, token, expiresAt, streamUrl }
 */
router.post('/generate-token', apiKeyAuth, (req, res) => {
  const { filename } = req.body;
  
  if (!filename) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Filename es requerido' 
    });
  }
  
  // Verificar que el archivo existe
  const DOWNLOAD_PATH = process.env.AUDIO_DOWNLOAD_PATH || path.join(__dirname, '../../downloads/audios');
  const filePath = path.join(DOWNLOAD_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ 
      ok: false, 
      error: 'Archivo no encontrado' 
    });
  }
  
  const token = tempTokenService.generateToken(filename, 30);
  
  res.json({
    ok: true,
    token: token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    streamUrl: `${req.protocol}://${req.get('host')}/api/audio-download/stream/${encodeURIComponent(filename)}?token=${token}`
  });
});

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
 * Descarga un archivo MP3 específico (con API Key)
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 * Nota: Para streaming sin API Key, usar /stream/:filename?token=XXX
 */
router.get('/download/:filename', apiKeyAuth, audioDownloadController.getFile);

/**
 * DELETE /api/audio-download/delete/:filename
 * Elimina un archivo MP3 específico
 * Headers requeridos: x-api-key: <tu-api-key> o Authorization: Bearer <tu-api-key>
 */
router.delete('/delete/:filename', apiKeyAuth, audioDownloadController.deleteFile);

module.exports = router;
