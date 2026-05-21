// src/jobs/fse-monitor.job.js
const cron = require('node-cron');
const DebugLogger = require('../utils/debug-logger');
const FSEconomyService = require('../services/fseconomy.service');
const TelegramService = require('../services/telegram.service');

class FSEMonitorJob {
  constructor() {
    this.fse = new FSEconomyService(
      process.env.FSE_USERKEY,
      process.env.FSE_READ_KEY
    );
    this.telegram = new TelegramService(
      process.env.TELEGRAM_BOT_TOKEN,
      process.env.TELEGRAM_CHAT_ID
    );
  }

  /**
   * Verifica supplies críticos (<30 días) y envía alerta URGENTE
   */
  async checkCriticalSupplies() {
    try {
      DebugLogger.log('JOBS', 'Running critical supplies check');
      
      const fbos = await this.fse.getMyFBOs();
      const critical = fbos.filter(f => f.daysOfSupplies !== null && f.daysOfSupplies < 30);
      
      if (critical.length === 0) {
        DebugLogger.log('JOBS', 'No critical supplies alerts');
        return;
      }
      
      let message = `🔴 <b>ALERTA CRÍTICA - Supplies Bajos</b>\n\n`;
      message += `<i>Estos FBOs requieren reabastecimiento INMEDIATO:</i>\n\n`;
      
      for (const fbo of critical) {
        const urgency = fbo.daysOfSupplies < 7 ? '🚨 URGENTE' : '⚠️ Pronto';
        message += `${urgency} <b>${fbo.icao}</b> - ${fbo.name}\n`;
        message += `   📦 Supplies: ${fbo.supplies.toLocaleString()} kg\n`;
        message += `   ⏱️ Autonomía: ~${fbo.daysOfSupplies.toFixed(0)} días\n\n`;
      }
      
      await this.telegram.sendMessage(message, { parse_mode: 'HTML' });
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
      
      const fbos = await this.fse.getMyFBOs();
      const totalSupplies = fbos.reduce((sum, f) => sum + (f.supplies || 0), 0);
      const validDays = fbos.filter(f => f.daysOfSupplies !== null);
      const avgDays = validDays.length > 0 
        ? validDays.reduce((sum, f) => sum + f.daysOfSupplies, 0) / validDays.length 
        : null;
      
      let message = `📊 <b>Resumen Diario ZAM-AIR</b> - ${new Date().toLocaleDateString('es-CO')}\n\n`;
      message += `🏢 FBOs activos: ${fbos.length}\n`;
      message += `📦 Total supplies: ${totalSupplies.toLocaleString()} kg\n`;
      message += `⏱️ Promedio autonomía: ${avgDays?.toFixed(0) || 'N/A'} días\n`;
      
      const attention = fbos.filter(f => f.daysOfSupplies !== null && f.daysOfSupplies < 60 && f.daysOfSupplies >= 30);
      if (attention.length > 0) {
        message += `\n🟡 <b>Atención requerida:</b>\n`;
        for (const fbo of attention) {
          message += `• ${fbo.icao}: ${fbo.daysOfSupplies.toFixed(0)} días\n`;
        }
      }
      
      await this.telegram.sendMessage(message, { parse_mode: 'HTML' });
      DebugLogger.log('JOBS', 'Daily summary sent');
      
    } catch (error) {
      DebugLogger.error('JOBS', 'Error in sendDailySummary', error);
    }
  }

  /**
   * Iniciar todos los jobs con sus schedules
   */
  start() {
    // Solo ejecutar en producción
    if (process.env.NODE_ENV !== 'production') {
      DebugLogger.log('JOBS', 'Jobs skipped (non-production)');
      return;
    }
    
    // Alertas críticas cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      await this.checkCriticalSupplies();
    }, { timezone: 'America/Bogota' });
    
    // Reporte diario 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      await this.sendDailySummary();
    }, { timezone: 'America/Bogota' });
    
    DebugLogger.log('JOBS', 'All monitor jobs started');
  }
}

// Instancia única del job
let fseMonitorInstance = null;

/**
 * Inicializa el job de monitoreo FSE
 * @returns {boolean} true si se inicializó correctamente
 */
function initialize() {
  try {
    // Verificar si Telegram está habilitado
    if (!global.telegramEnabled) {
      DebugLogger.log('JOBS', 'FSE Monitor skipped (Telegram not enabled)');
      return false;
    }
    
    fseMonitorInstance = new FSEMonitorJob();
    DebugLogger.log('JOBS', 'FSE Monitor initialized');
    return true;
  } catch (error) {
    DebugLogger.error('JOBS', 'Error initializing FSE Monitor', error);
    return false;
  }
}

/**
 * Inicia todos los jobs programados
 */
function startAllJobs() {
  if (!fseMonitorInstance) {
    DebugLogger.log('JOBS', 'Cannot start jobs: instance not initialized');
    return;
  }
  fseMonitorInstance.start();
}

// ✅ Exportar la clase Y las funciones helper
module.exports = {
  FSEMonitorJob,
  initialize,
  startAllJobs
};
