const cron = require('node-cron');
const TelegramService = require('../services/telegram.service');
const FSEconomyService = require('../services/fseconomy.service');
const DebugLogger = require('../utils/debug-logger');

/**
 * Jobs programados para monitoreo automático de FSEconomy
 * Envía alertas push cuando los suministros están bajos
 */
class FSEMonitorJob {
  constructor() {
    this.telegramService = null;
    this.fseconomyService = null;
    this.chatId = null;
    this.initialized = false;
  }

  /**
   * Inicializa los servicios necesarios
   */
  initialize() {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      const fseUserKey = process.env.FSE_USERKEY;
      const fseReadKey = process.env.FSE_READ_KEY;

      if (!botToken || !chatId || !fseUserKey || !fseReadKey) {
        DebugLogger.warn('JOBS', 'Variables incompletas para FSE Monitor Job. Jobs no iniciados.');
        return false;
      }

      this.telegramService = new TelegramService(botToken);
      this.fseconomyService = new FSEconomyService(fseUserKey, fseReadKey);
      this.chatId = chatId;
      this.initialized = true;

      DebugLogger.log('JOBS', 'FSE Monitor Job initialized');
      return true;
    } catch (error) {
      DebugLogger.error('JOBS', 'Error inicializando FSE Monitor Job', error);
      return false;
    }
  }

  /**
   * Inicia todos los jobs programados
   * Solo se ejecuta en production y si telegram está habilitado
   */
  startAllJobs() {
    if (!this.initialized) {
      DebugLogger.warn('JOBS', 'FSE Monitor Job no inicializado. Skipping jobs.');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      DebugLogger.log('JOBS', 'Jobs solo se ejecutan en production. Skipping.');
      return;
    }

    if (!global.telegramEnabled) {
      DebugLogger.log('JOBS', 'Telegram no habilitado. Skipping FSE Monitor jobs.');
      return;
    }

    // Job 1: Verificación diaria de suministros a las 8:00 AM
    // Cron: Minuto Hora Día Mes DíaSemana
    cron.schedule('0 8 * * *', async () => {
      DebugLogger.log('JOBS', 'Ejecutando verificación diaria de suministros...');
      await this.sendDailySummary();
    }, {
      timezone: 'America/Bogota' // Ajustar según zona horaria
    });

    // Job 2: Verificación crítica cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      DebugLogger.log('JOBS', 'Ejecutando verificación crítica...');
      await this.checkCriticalSupplies();
    }, {
      timezone: 'America/Bogota'
    });

    DebugLogger.log('JOBS', 'Todos los jobs de FSE Monitor iniciados');
  }
}

// Exportar instancia singleton
const fseMonitorJob = new FSEMonitorJob();

module.exports = fseMonitorJob;

  /**
   * Verifica supplies críticos (<30 días) y envía alerta URGENTE
   */
  async checkCriticalSupplies() {
    try {
      DebugLogger.log('JOBS', 'Running critical supplies check');
      
      const fbos = await this.fseconomyService.getMyFBOs();
      const critical = fbos.filter(f => f.daysOfSupplies !== null && f.daysOfSupplies < 30);
      
      if (critical.length === 0) {
        DebugLogger.log('JOBS', 'No critical supplies alerts');
        return;
      }
      
      // Mensaje URGENTE con formato destacado
      let message = `🔴 <b>ALERTA CRÍTICA - Supplies Bajos</b>\n\n`;
      message += `<i>Estos FBOs requieren reabastecimiento INMEDIATO:</i>\n\n`;
      
      for (const fbo of critical) {
        const urgency = fbo.daysOfSupplies < 7 ? '🚨 URGENTE' : '⚠️ Pronto';
        message += `${urgency} <b>${fbo.icao}</b> - ${fbo.name}\n`;
        message += `   📦 Supplies: ${fbo.supplies.toLocaleString()} kg\n`;
        message += `   ⏱️ Autonomía: ~${fbo.daysOfSupplies.toFixed(0)} días\n`;
        message += `   💡 Acción: Reabastecer antes de que se agoten\n\n`;
      }
      
      message += `<i>Para reabastecer: usa la app web o vuela supplies al aeropuerto.</i>`;
      
      await this.telegramService.sendMessage(this.chatId, message);
      DebugLogger.log('JOBS', `Sent critical alert for ${critical.length} FBOs`);
      
    } catch (error) {
      DebugLogger.error('JOBS', 'Error in checkCriticalSupplies', error);
    }
  }

  /**
   * Reporte diario resumen (8:00 AM)
   */
  async sendDailySummary() {
    try {
      DebugLogger.log('JOBS', 'Generating daily summary');
      
      const fbos = await this.fseconomyService.getMyFBOs();
      const totalSupplies = fbos.reduce((sum, f) => sum + (f.supplies || 0), 0);
      const validDays = fbos.filter(f => f.daysOfSupplies !== null);
      const avgDays = validDays.length > 0 
        ? validDays.reduce((sum, f) => sum + f.daysOfSupplies, 0) / validDays.length 
        : null;
      
      let message = `📊 <b>Resumen Diario ZAM-AIR</b> - ${new Date().toLocaleDateString('es-CO')}\n\n`;
      message += `🏢 FBOs activos: ${fbos.length}\n`;
      message += `📦 Total supplies: ${totalSupplies.toLocaleString()} kg\n`;
      message += `⏱️ Promedio autonomía: ${avgDays?.toFixed(0) || 'N/A'} días\n`;
      
      // Listar FBOs con <60 días (amarillo)
      const attention = fbos.filter(f => f.daysOfSupplies !== null && f.daysOfSupplies < 60 && f.daysOfSupplies >= 30);
      if (attention.length > 0) {
        message += `\n🟡 <b>Atención requerida:</b>\n`;
        for (const fbo of attention) {
          message += `• ${fbo.icao}: ${fbo.daysOfSupplies.toFixed(0)} días\n`;
        }
      }
      
      message += `\n<i>Próxima verificación crítica: en 6 horas</i>`;
      
      await this.telegramService.sendMessage(this.chatId, message);
      DebugLogger.log('JOBS', 'Daily summary sent');
      
    } catch (error) {
      DebugLogger.error('JOBS', 'Error in sendDailySummary', error);
    }
  }

  /**
   * Detiene todos los jobs (para graceful shutdown)
   */
  stopAllJobs() {
    cron.getScheduledTasks().forEach(task => task.stop());
    DebugLogger.log('JOBS', 'FSE Monitor Jobs detenidos');
  }
}

// Exportar instancia singleton
const fseMonitorJob = new FSEMonitorJob();

module.exports = fseMonitorJob;
