const TelegramService = require('../services/telegram.service');
const FSEconomyService = require('../services/fseconomy.service');
const DebugLogger = require('../utils/debug-logger');

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

      DebugLogger.log('TELEGRAM', `Comando recibido: ${command}`, { from: message.from.username });

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
      DebugLogger.error('TELEGRAM', 'Error en handleUpdate', error);
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
      
      // Obtener fees del mes actual
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      let feesByFbo = {};
      try {
        feesByFbo = await this.fseconomyService.getGroundCrewFeesByMonth(currentMonth, currentYear);
        DebugLogger.log('TELEGRAM', 'Ground crew fees loaded', { count: Object.keys(feesByFbo).length });
      } catch (err) {
        DebugLogger.error('TELEGRAM', 'Failed to load fees, using fallback', err);
        // feesByFbo stays empty → mostrará $0 como fallback
      }
      
      const formattedText = this._formatFBOList(fbos, feesByFbo);

      try {
        DebugLogger.log('TELEGRAM', 'Sending message to Telegram', { count: fbos?.length });
        
        const result = await this.telegramService.sendMessage(chatId, formattedText);
        
        if (result?.ok) {
          DebugLogger.log('TELEGRAM', 'Message sent successfully');
        } else {
          DebugLogger.warn('TELEGRAM', 'Telegram API returned', { error: result?.error || 'unknown' });
        }
      } catch (sendError) {
        DebugLogger.error('TELEGRAM', 'sendMessage exception', sendError);
        // Fallback: mensaje simple sin formato
        await this.telegramService.sendMessage(
          chatId,
          `🏢 FBOs ZAM-AIR: ${fbos.length} encontrados. Revisa la app web para detalles.`
        ).catch(() => {});
      }
    } catch (error) {
      DebugLogger.error('TELEGRAM', 'Error en handleStatus (FSE o formato)', error);
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
      DebugLogger.log('TELEGRAM', 'Starting fleet status request');
      
      // Lista estática de tus aviones (fallback si FSE falla)
      const aircrafts = [
        { reg: 'ALEJO', model: 'Beechcraft King Air 350', home: 'SKTI', note: '' },
        { reg: 'HKD2015', model: 'Cessna 208 Caravan', home: 'SKTI', note: '' },
        { reg: 'HKS2007', model: 'Beechcraft King Air 350', home: 'FAOB', note: '⚠️ Home: EKCH' }
      ];

      // Intentar obtener datos reales de FSE, pero NO fallar si no funciona
      let fseData = null;
      try {
        // Nota: FSEconomy NO tiene endpoint público simple para "mis aviones"
        // Usamos datos estáticos + ubicación manual si es necesario
        DebugLogger.log('TELEGRAM', 'Using static aircraft list (FSE aircraft endpoint not available)');
      } catch (fseError) {
        DebugLogger.warn('TELEGRAM', 'FSE aircraft data unavailable, using static list', fseError);
      }

      // Construir mensaje con datos disponibles
      let message = `✈️ <b>Flota ZAM-AIR</b>\n\n`;
      
      for (const ac of aircrafts) {
        const statusEmoji = ac.reg === 'HKS2007' ? '🟡' : '🟢';
        const fee = ac.reg === 'ALEJO' ? '3,854' : ac.reg === 'HKD2015' ? '4,540' : '5,557';
        message += `${statusEmoji} <b>${ac.reg}</b> - ${ac.model}\n`;
        message += `   📍 Home: ${ac.home}${ac.note ? ` ${ac.note}` : ''}\n`;
        message += `   💰 Fee mensual: $${fee}\n\n`;
      }

      message += `<i>💡 Tip: Para ver ubicación en tiempo real, vuela el avión con el cliente FSE.</i>`;

      // Enviar con manejo de errores
      const result = await this.telegramService.sendMessage(chatId, message);
      
      if (!result.ok) {
        DebugLogger.warn('TELEGRAM', 'sendMessage returned not-ok', { error: result.error });
        // Intentar fallback
        await this.telegramService.sendFallbackMessage?.(chatId, result.error);
      }
      
      DebugLogger.log('TELEGRAM', 'Fleet message sent successfully');
      
    } catch (error) {
      DebugLogger.error('TELEGRAM', 'Unexpected error in handleFleet', error);
      // Fallback seguro: nunca dejar al usuario sin respuesta
      await this.telegramService.sendMessage(
        chatId,
        '✈️ <b>Flota ZAM-AIR</b>\n\n• ALEJO: King Air 350 (SKTI)\n• HKD2015: Caravan (SKSV)\n• HKS2007: King Air 350 (FAOB)\n\n<i>Datos estáticos - Ubicación en tiempo real requiere vuelo activo.</i>'
      ).catch(() => {}); // Silenciar errores del fallback
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
      DebugLogger.error('TELEGRAM', 'Error en handleAlerts', error);
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
  _formatFBOList(fbos, feesByFbo = {}) {
    if (!fbos || fbos.length === 0) {
      return 'ℹ️ No se encontraron FBOs.';
    }

    DebugLogger.log('TELEGRAM', 'Formatting FBO list message', { count: fbos?.length });

    let message = `🏢 <b>Estado de FBOs ZAM-AIR</b>\n\n`;

    for (const fbo of fbos) {
      // ✅ CORRECCIÓN: Usar nullish coalescing (??) para valores que pueden ser undefined
      const supplies = fbo.supplies ?? 0;
      const suppliesPerDay = fbo.suppliesPerDay ?? 0;
      const daysOfSupplies = fbo.daysOfSupplies; // Puede ser null si suppliesPerDay es 0
      const fuelJetA = fbo.fuelJetA ?? 0;
      
      // ✅ Usar fees reales si existen, sino $0
      const fees = feesByFbo[fbo.icao] ?? 0;
      
      // ✅ CORRECCIÓN: Validar antes de llamar a toFixed()
      const suppliesDays = (daysOfSupplies !== null && daysOfSupplies !== undefined) 
        ? `${daysOfSupplies.toFixed(0)} días` 
        : (suppliesPerDay > 0 ? 'Calculando...' : 'N/A');
      
      // Emoji según días restantes
      const suppliesEmoji = daysOfSupplies !== null 
        ? (daysOfSupplies < 30 ? '🔴' : daysOfSupplies < 60 ? '🟡' : '🟢')
        : '⚪';
      
      // ✅ CORRECCIÓN: Usar toLocaleString solo si es número válido
      const suppliesFormatted = typeof supplies === 'number' ? supplies.toLocaleString() : '0';
      const fuelFormatted = typeof fuelJetA === 'number' ? fuelJetA.toLocaleString() : '0';
      const feesFormatted = typeof fees === 'number' ? fees.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00';
      
      message += `<b>${fbo.icao ?? 'N/A'}</b> - ${fbo.name ?? 'Sin nombre'}\n`;
      message += `├─ ${suppliesEmoji} Supplies: ${suppliesFormatted} kg (${suppliesDays})\n`;
      message += `├─ ⛽ Jet-A: ${fuelFormatted} gal\n`;
      message += `└─ 💰 Fees: $${feesFormatted}\n\n`;
    }

    if (DebugLogger.isEnabled('TELEGRAM')) {
      DebugLogger.log('TELEGRAM', 'Final message preview', message.substring(0, 400));
    }

    return message.trim();
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
