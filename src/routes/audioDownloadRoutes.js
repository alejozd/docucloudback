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
  const { token } = req.query;
  
  console.log('[stream] === DEBUG ===');
  console.log('[stream] Filename:', filename);
  console.log('[stream] Token recibido:', token ? token.substring(0, 15) + '...' : 'NINGUNO');
  
  if (!token) {
    console.log('[stream] ❌ Token no proporcionado');
    return res.status(401).json({ 
      ok: false, 
      error: 'Token requerido' 
    });
  }
  
  const tokenData = tempTokenService.validateToken(token);
  
  if (!tokenData) {
    console.log('[stream] ❌ Token inválido, expirado o no encontrado');
    return res.status(401).json({ 
      ok: false, 
      error: 'Token inválido, expirado o ya usado' 
    });
  }
  
  if (tokenData.filename !== filename) {
    console.log('[stream] ❌ Token no corresponde a este archivo');
    console.log('[stream] Token filename:', tokenData.filename);
    console.log('[stream] Request filename:', filename);
    return res.status(403).json({ 
      ok: false, 
      error: 'Token no corresponde a este archivo' 
    });
  }
  
  console.log('[stream] ✅ Token válido, procediendo con streaming');
  
  // Reutilizar la lógica de streaming del controlador
  req.params.filename = filename;
  audioDownloadController.getFile(req, res);
});

// Endpoint para generar token temporal (PROTEGIDO con apiKeyAuth inline)
router.post('/generate-token', apiKeyAuth, (req, res) => {
  const { filename } = req.body;
  
  console.log('[generate-token] === DEBUG ===');
  console.log('[generate-token] Filename solicitado:', filename);
  
  if (!filename) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Filename es requerido' 
    });
  }
  
  // Verificar que el archivo existe
  const DOWNLOAD_PATH = process.env.AUDIO_DOWNLOAD_PATH || path.join(__dirname, '../../downloads/audios');
  const filePath = path.join(DOWNLOAD_PATH, filename);
  
  console.log('[generate-token] Buscando archivo en:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.log('[generate-token] ❌ Archivo no encontrado');
    return res.status(404).json({ 
      ok: false, 
      error: 'Archivo no encontrado' 
    });
  }
  
  const token = tempTokenService.generateToken(filename, 30);
  const streamUrl = `${req.protocol}://${req.get('host')}/api/audio-download/stream/${encodeURIComponent(filename)}?token=${token}`;
  
  console.log('[generate-token] ✅ Token generado');
  console.log('[generate-token] Stream URL:', streamUrl);
  
  res.json({
    ok: true,
    token: token,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    streamUrl: streamUrl
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
