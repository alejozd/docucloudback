const TelegramService = require('../services/telegram.service');
const FSEconomyService = require('../services/fseconomy.service');

/**
 * Controlador para manejar comandos y respuestas del Telegram Bot
 * Procesa los updates recibidos vía webhook
 */
class TelegramController {
  constructor(telegramService, fseconomyService, chatId) {
    this.telegramService = telegramService;
    this.fseconomyService = fseconomyService;
    this.chatId = chatId;
  }

  /**
   * Maneja el update recibido desde Telegram webhook
   * @param {Object} req - Request de Express
   * @param {Object} res - Response de Express
   * @returns {Promise<void>}
   */
  async handleUpdate(req, res) {
    try {
      const update = req.body;

      // Siempre responder 200 a Telegram (<30s requirement)
      res.status(200).json({ ok: true });

      // Ignorar updates que no sean mensajes de texto
      if (!update.message || !update.message.text) {
        // Manejar callback queries (botones)
        if (update.callback_query) {
          await this.handleCallbackQuery(update.callback_query);
        }
        return;
      }

      const message = update.message;
      const command = message.text.split(' ')[0].toLowerCase();
      const args = message.text.split(' ').slice(1);

      console.log(`📨 Comando recibido: ${command} de ${message.from.username}`);

      // Router de comandos
      switch (command) {
        case '/start':
          await this.handleStart(message.chat.id);
          break;
        case '/status':
        case '/fbo':
          await this.handleStatus(message.chat.id);
          break;
        case '/fleet':
        case '/aviones':
          await this.handleFleet(message.chat.id);
          break;
        case '/alerts':
          await this.handleAlerts(message.chat.id);
          break;
        case '/help':
          await this.handleHelp(message.chat.id);
          break;
        default:
          await this.handleUnknownCommand(message.chat.id, command);
      }
    } catch (error) {
      console.error('❌ Error en handleUpdate:', error.message);
      // No enviar error a Telegram para evitar loops
    }
  }

  /**
   * Maneja comando /start - Mensaje de bienvenida
   * @param {string} chatId - ID del chat
   */
  async handleStart(chatId) {
    const welcomeText = `
<b>✈️ Bienvenido al FSE Monitor</b>

Soy tu asistente personal para monitorear tu operación en <i>FSEconomy</i>.

<b>Comandos disponibles:</b>
/status - Estado de tus FBOs y suministros
/fleet - Lista de tus aeronaves
/alerts - Alertas activas
/help - Ayuda y lista de comandos

<i>¡Buen vuelo!</i> 🛫
`.trim();

    const inlineKeyboard = [
      [{ text: '📊 Ver FBOs', callback_data: 'show_fbos' }],
      [{ text: '✈️ Ver Flota', callback_data: 'show_fleet' }],
      [{ text: '⚠️ Ver Alertas', callback_data: 'show_alerts' }]
    ];

    await this.telegramService.sendMessageWithButtons(chatId, welcomeText, inlineKeyboard);
  }

  /**
   * Maneja comando /status - Lista de FBOs con suministros
   * @param {string} chatId - ID del chat
   */
  async handleStatus(chatId) {
    try {
      // Enviar mensaje de "cargando"
      await this.telegramService.sendMessage(chatId, '⏳ Consultando FSEconomy...');

      const fbos = await this.fseconomyService.getMyFBOs();
      const formattedText = this._formatFBOList(fbos);

      await this.telegramService.sendMessage(chatId, formattedText);
    } catch (error) {
      const errorMsg = '⚠️ Servicio temporalmente no disponible. Intenta en unos minutos.';
      await this.telegramService.sendMessage(chatId, errorMsg);
    }
  }

  /**
   * Maneja comando /fleet - Lista de aeronaves
   * @param {string} chatId - ID del chat
   */
  async handleFleet(chatId) {
    try {
      await this.telegramService.sendMessage(chatId, '⏳ Consultando flota...');

      const aircraft = await this.fseconomyService.getFleet();
      const formattedText = this._formatAircraftList(aircraft);

      await this.telegramService.sendMessage(chatId, formattedText);
    } catch (error) {
      const errorMsg = '⚠️ Servicio temporalmente no disponible. Intenta en unos minutos.';
      await this.telegramService.sendMessage(chatId, errorMsg);
    }
  }

  /**
   * Maneja comando /alerts - Resumen de alertas
   * @param {string} chatId - ID del chat
   */
  async handleAlerts(chatId) {
    try {
      await this.telegramService.sendMessage(chatId, '⏳ Verificando alertas...');

      const fbos = await this.fseconomyService.getMyFBOs();
      const alerts = this.fseconomyService.checkAlerts(fbos);
      const formattedText = this._formatAlerts(alerts);

      await this.telegramService.sendMessage(chatId, formattedText);
    } catch (error) {
      const errorMsg = '⚠️ Servicio temporalmente no disponible. Intenta en unos minutos.';
      await this.telegramService.sendMessage(chatId, errorMsg);
    }
  }

  /**
   * Maneja comando /help - Lista de comandos
   * @param {string} chatId - ID del chat
   */
  async handleHelp(chatId) {
    const helpText = `
<b>📚 Comandos Disponibles</b>

/start - Mensaje de bienvenida
/status o /fbo - Estado de FBOs y suministros
/fleet o /aviones - Lista de aeronaves
/alerts - Alertas de suministros bajos
/help - Esta ayuda

<b>💡 Tips:</b>
• Los suministros se consideran <b>bajos</b> cuando quedan menos de 30 días
• Las alertas <b>críticas</b> son menos de 7 días
• El bot monitorea automáticamente cada 6 horas

<i>FSE Monitor v1.0</i>
`.trim();

    await this.telegramService.sendMessage(chatId, helpText);
  }

  /**
   * Maneja comandos desconocidos
   * @param {string} chatId - ID del chat
   * @param {string} command - Comando recibido
   */
  async handleUnknownCommand(chatId, command) {
    const response = `❓ Comando <code>${command}</code> no reconocido.\n\nUsa /help para ver la lista de comandos disponibles.`;
    await this.telegramService.sendMessage(chatId, response);
  }

  /**
   * Maneja callback queries de botones inline
   * @param {Object} callbackQuery - Callback query de Telegram
   */
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Responder al callback (requerido por Telegram)
    await this.telegramService.sendMessage(chatId, '_processing_', { parse_mode: 'Markdown' });

    switch (data) {
      case 'show_fbos':
        await this.handleStatus(chatId);
        break;
      case 'show_fleet':
        await this.handleFleet(chatId);
        break;
      case 'show_alerts':
        await this.handleAlerts(chatId);
        break;
    }
  }

  /**
   * Formatea lista de FBOs para mensaje HTML
   * @param {Array} fbos - Array de FBOs
   * @returns {string} Texto formateado
   */
  _formatFBOList(fbos) {
    if (!fbos || fbos.length === 0) {
      return 'ℹ️ No se encontraron FBOs.';
    }

    let text = '<b>🏢 Mis FBOs</b>\n\n';

    fbos.forEach((fbo, index) => {
      const statusEmoji = this._getFuelStatusEmoji(fbo.daysOfSupplies);
      text += `${statusEmoji} <b>${fbo.icao}</b> - ${fbo.name}\n`;
      text += `   Suministros: <b>${fbo.supplies.toLocaleString()}</b> gal\n`;
      text += `   Consumo diario: <b>${fbo.dailyConsumption.toFixed(1)}</b> gal/día\n`;
      text += `   Días restantes: <b>${fbo.daysOfSupplies}</b> días\n`;
      text += `   Ground Fees: $<b>${fbo.groundCrewFees.toFixed(2)}</b>\n\n`;
    });

    return text.trim();
  }

  /**
   * Formatea lista de aeronaves para mensaje HTML
   * @param {Array} aircraft - Array de aeronaves
   * @returns {string} Texto formateado
   */
  _formatAircraftList(aircraft) {
    if (!aircraft || aircraft.length === 0) {
      return 'ℹ️ No se encontraron aeronaves.';
    }

    let text = '<b>✈️ Mi Flota</b>\n\n';

    aircraft.forEach((ac, index) => {
      text += `🛩️ <b>${ac.registration}</b>\n`;
      text += `   Tipo: ${ac.type}\n`;
      text += `   Ubicación: ${ac.location || 'N/A'}\n`;
      text += `   Horas totales: <b>${ac.totalHours.toFixed(1)}</b>h\n`;
      text += `   Horas motor: <b>${ac.engineHours.toFixed(1)}</b>h\n\n`;
    });

    return text.trim();
  }

  /**
   * Formatea resumen de alertas para mensaje HTML
   * @param {Object} alerts - Objeto con alertas categorizadas
   * @returns {string} Texto formateado
   */
  _formatAlerts(alerts) {
    let text = '<b>🔔 Resumen de Alertas</b>\n\n';

    if (alerts.critical.length === 0 && alerts.warning.length === 0 && alerts.info.length === 0) {
      text += '✅ ¡Todo en orden! No hay alertas activas.\n';
    } else {
      if (alerts.critical.length > 0) {
        text += `🚨 <b>CRÍTICAS (${alerts.critical.length}):</b>\n`;
        alerts.critical.forEach(fbo => {
          text += `   • ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes\n`;
        });
        text += '\n';
      }

      if (alerts.warning.length > 0) {
        text += `⚠️ <b>ADVERTENCIAS (${alerts.warning.length}):</b>\n`;
        alerts.warning.forEach(fbo => {
          text += `   • ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes\n`;
        });
        text += '\n';
      }

      if (alerts.info.length > 0) {
        text += `ℹ️ <b>INFORMATIVAS (${alerts.info.length}):</b>\n`;
        alerts.info.forEach(fbo => {
          text += `   • ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes\n`;
        });
      }
    }

    return text.trim();
  }

  /**
   * Obtiene emoji según estado de suministros
   * @param {number} daysOfSupplies - Días restantes
   * @returns {string} Emoji correspondiente
   */
  _getFuelStatusEmoji(daysOfSupplies) {
    if (daysOfSupplies >= 90) return '🟢';
    if (daysOfSupplies >= 60) return '🔵';
    if (daysOfSupplies >= 30) return '🟡';
    if (daysOfSupplies >= 14) return '🟠';
    if (daysOfSupplies >= 7) return '🔴';
    return '🚨';
  }
}

module.exports = TelegramController;
