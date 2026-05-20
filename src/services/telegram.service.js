const axios = require('axios');

/**
 * Servicio de comunicación con Telegram Bot API
 * Maneja el envío de mensajes y configuración del webhook
 */
class TelegramService {
  constructor(botToken) {
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN es requerido');
    }
    
    this.botToken = botToken;
    this.baseURL = `https://api.telegram.org/bot${botToken}`;
    this.timeout = 10000; // 10 segundos timeout
  }

  /**
   * Envía un mensaje formateado en HTML
   * @param {string} chatId - ID del chat
   * @param {string} text - Texto del mensaje (soporta HTML)
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} Respuesta de Telegram API
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const response = await axios.post(
        `${this.baseURL}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          ...options
        },
        { timeout: this.timeout }
      );

      if (response.data.ok) {
        console.log(`✅ Mensaje enviado a ${chatId}`);
        return response.data.result;
      } else {
        console.error('❌ Error enviando mensaje:', response.data.description);
        throw new Error(response.data.description);
      }
    } catch (error) {
      console.error('❌ Telegram API error:', error.message);
      throw error;
    }
  }

  /**
   * Envía un mensaje con botones inline
   * @param {string} chatId - ID del chat
   * @param {string} text - Texto del mensaje
   * @param {Array<Array>} inlineKeyboard - Array de filas de botones
   * @returns {Promise<Object>} Respuesta de Telegram API
   */
  async sendMessageWithButtons(chatId, text, inlineKeyboard) {
    try {
      const response = await axios.post(
        `${this.baseURL}/sendMessage`,
        {
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        },
        { timeout: this.timeout }
      );

      if (response.data.ok) {
        console.log(`✅ Mensaje con botones enviado a ${chatId}`);
        return response.data.result;
      } else {
        console.error('❌ Error enviando mensaje con botones:', response.data.description);
        throw new Error(response.data.description);
      }
    } catch (error) {
      console.error('❌ Telegram API error:', error.message);
      throw error;
    }
  }

  /**
   * Configura el webhook para recibir updates
   * @param {string} webhookUrl - URL completa del webhook
   * @returns {Promise<Object>} Respuesta de Telegram API
   */
  async setWebhook(webhookUrl) {
    try {
      const response = await axios.post(
        `${this.baseURL}/setWebhook`,
        {
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query']
        },
        { timeout: this.timeout }
      );

      if (response.data.ok) {
        console.log(`✅ Webhook configurado: ${webhookUrl}`);
        return response.data;
      } else {
        console.error('❌ Error configurando webhook:', response.data.description);
        throw new Error(response.data.description);
      }
    } catch (error) {
      console.error('❌ Telegram API error:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene información del webhook actual
   * @returns {Promise<Object>} Información del webhook
   */
  async getWebhookInfo() {
    try {
      const response = await axios.get(
        `${this.baseURL}/getWebhookInfo`,
        { timeout: this.timeout }
      );

      if (response.data.ok) {
        return response.data.result;
      } else {
        console.error('❌ Error obteniendo webhook info:', response.data.description);
        throw new Error(response.data.description);
      }
    } catch (error) {
      console.error('❌ Telegram API error:', error.message);
      throw error;
    }
  }

  /**
   * Elimina el webhook (para desarrollo)
   * @returns {Promise<Object>} Respuesta de Telegram API
   */
  async deleteWebhook() {
    try {
      const response = await axios.post(
        `${this.baseURL}/deleteWebhook`,
        {},
        { timeout: this.timeout }
      );

      if (response.data.ok) {
        console.log('✅ Webhook eliminado');
        return response.data;
      } else {
        console.error('❌ Error eliminando webhook:', response.data.description);
        throw new Error(response.data.description);
      }
    } catch (error) {
      console.error('❌ Telegram API error:', error.message);
      throw error;
    }
  }

  /**
   * Envía notificación de alerta
   * @param {string} chatId - ID del chat
   * @param {string} title - Título de la alerta
   * @param {string} message - Mensaje de la alerta
   * @param {string} priority - Prioridad: 'info', 'warning', 'critical'
   * @returns {Promise<Object>} Respuesta de Telegram API
   */
  async sendAlert(chatId, title, message, priority = 'info') {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨'
    };

    const emoji = emojis[priority] || emojis.info;
    const formattedText = `
<b>${emoji} ${title}</b>

${message}

<i>Enviado desde FSE Monitor</i>
`.trim();

    return this.sendMessage(chatId, formattedText);
  }
}

module.exports = TelegramService;
