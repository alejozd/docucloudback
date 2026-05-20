const express = require('express');
const rateLimit = require('express-rate-limit');
const TelegramController = require('../controllers/telegram.controller');
const TelegramService = require('../services/telegram.service');
const FSEconomyService = require('../services/fseconomy.service');

const router = express.Router();

// Rate limiting para proteger el webhook (máx 100 peticiones por minuto)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 peticiones por minuto
  message: { error: 'Too many requests from this IP' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Inicializa servicios y controlador
 * Se ejecuta una vez al montar las rutas
 */
let controller = null;

const initializeTelegramModule = () => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const fseUserKey = process.env.FSE_USERKEY;
    const fseReadKey = process.env.FSE_READ_KEY;

    if (!botToken || !chatId || !fseUserKey || !fseReadKey) {
      console.warn('⚠️  Variables de Telegram incompletas. Bot no inicializado.');
      return null;
    }

    const telegramService = new TelegramService(botToken);
    const fseconomyService = new FSEconomyService(fseUserKey, fseReadKey);
    controller = new TelegramController(telegramService, fseconomyService, chatId);

    console.log('✅ Telegram bot module loaded');
    return controller;
  } catch (error) {
    console.error('❌ Error inicializando módulo de Telegram:', error.message);
    return null;
  }
};

/**
 * POST /webhook - Endpoint principal para Telegram
 * Recibe updates desde Telegram Bot API
 */
router.post('/webhook', webhookLimiter, async (req, res) => {
  // Logging básico para debugging
  console.log('📨 Webhook received:', req.body.update_id ? `update_id=${req.body.update_id}` : 'no update_id');

  if (!controller) {
    console.warn('⚠️  Controller no inicializado, ignorando webhook');
    return res.status(200).json({ ok: true });
  }

  try {
    await controller.handleUpdate(req, res);
  } catch (error) {
    console.error('❌ Error processing webhook:', error.message);
    // Siempre responder 200 para evitar reintentos de Telegram
    res.status(200).json({ ok: true });
  }
});

/**
 * POST /setup-webhook - Endpoint auxiliar para configurar webhook
 * Solo para uso en desarrollo/deployment
 */
router.post('/setup-webhook', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 'https://api.zdevs.uk/telegram/webhook';

    if (!botToken) {
      return res.status(400).json({ 
        error: 'TELEGRAM_BOT_TOKEN no configurado' 
      });
    }

    const telegramService = new TelegramService(botToken);
    const result = await telegramService.setWebhook(webhookUrl);

    res.json({
      success: true,
      message: 'Webhook configurado exitosamente',
      webhookUrl: webhookUrl,
      details: result
    });
  } catch (error) {
    console.error('❌ Error configurando webhook:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /webhook-info - Obtiene información del webhook actual
 * Para debugging
 */
router.get('/webhook-info', async (req, res) => {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return res.status(400).json({ 
        error: 'TELEGRAM_BOT_TOKEN no configurado' 
      });
    }

    const telegramService = new TelegramService(botToken);
    const info = await telegramService.getWebhookInfo();

    res.json({
      success: true,
      webhookInfo: info
    });
  } catch (error) {
    console.error('❌ Error obteniendo webhook info:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Inicializar módulo al cargar rutas
initializeTelegramModule();

module.exports = router;
