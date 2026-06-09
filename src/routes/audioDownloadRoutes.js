const express = require('express');
const router = express.Router();
const audioDownloadController = require('../controllers/audioDownloadController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const tempTokenService = require('../services/tempTokenService');
const fs = require('fs');
const path = require('path');

// ============================================================
// RUTAS PÚBLICAS (SIN apiKeyAuth) - Deben ir PRIMERO
// ============================================================

// Endpoint de streaming con token temporal
router.get('/stream/:filename', (req, res) => {
  const { filename } = req.params;
  const { token, download } = req.query;
  
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
  
  // Si es descarga forzada, establecer headers diferentes
  if (download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
  } else {
    // Streaming normal
    res.setHeader('Content-Type', 'audio/mpeg');
  }

  // Reutilizar la lógica de streaming del controlador
  req.params.filename = filename;
  audioDownloadController.getFile(req, res);
});

// Endpoint para generar token temporal (PROTEGIDO con apiKeyAuth inline)
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
  const streamUrl = `${req.protocol}://${req.get('host')}/api/audio-download/stream/${encodeURIComponent(filename)}?token=${token}`;
  
  res.json({
    ok: true,
    token: token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    streamUrl: streamUrl
  });
});

// Endpoint de prueba para verificar que el servidor responde
router.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
    routes: {
      public: ['/stream/:filename', '/generate-token', '/test'],
      protected: ['/download', '/status/:filename', '/files', '/download/:filename', '/delete/:filename']
    }
  });
});

// ============================================================
// APLICAR MIDDLEWARE apiKeyAuth A TODAS LAS DEMÁS RUTAS
// ============================================================
router.use(apiKeyAuth);

// ============================================================
// RUTAS PROTEGIDAS (CON apiKeyAuth)
// ============================================================

router.post('/download', audioDownloadController.downloadAudio);
router.get('/status/:filename', audioDownloadController.getDownloadStatus);
router.get('/files', audioDownloadController.listFiles);
router.get('/download/:filename', audioDownloadController.getFile);
router.delete('/delete/:filename', audioDownloadController.deleteFile);

module.exports = router;
