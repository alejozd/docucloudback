const cron = require('node-cron');
const TelegramService = require('../services/telegram.service');
const FSEconomyService = require('../services/fseconomy.service');

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
        console.warn('⚠️  Variables incompletas para FSE Monitor Job. Jobs no iniciados.');
        return false;
      }

      this.telegramService = new TelegramService(botToken);
      this.fseconomyService = new FSEconomyService(fseUserKey, fseReadKey);
      this.chatId = chatId;
      this.initialized = true;

      console.log('✅ FSE Monitor Job initialized');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando FSE Monitor Job:', error.message);
      return false;
    }
  }

  /**
   * Inicia todos los jobs programados
   * Solo se ejecuta en production
   */
  startAllJobs() {
    if (!this.initialized) {
      console.warn('⚠️  FSE Monitor Job no inicializado. Skipping jobs.');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('ℹ️  Jobs solo se ejecutan en production. Skipping.');
      return;
    }

    // Job 1: Verificación diaria de suministros a las 8:00 AM
    // Cron: Minuto Hora Día Mes DíaSemana
    cron.schedule('0 8 * * *', async () => {
      console.log('🕐 [JOB] Ejecutando verificación diaria de suministros...');
      await this.checkDailySupplies();
    }, {
      timezone: 'America/Bogota' // Ajustar según zona horaria
    });

    // Job 2: Verificación crítica cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      console.log('🕐 [JOB] Ejecutando verificación crítica...');
      await this.checkCriticalAlerts();
    }, {
      timezone: 'America/Bogota'
    });

    console.log('✅ Todos los jobs de FSE Monitor iniciados');
  }

  /**
   * Verificación diaria de suministros (8:00 AM)
   * Alerta si algún FBO tiene menos de 30 días de suministros
   */
  async checkDailySupplies() {
    try {
      const fbos = await this.fseconomyService.getMyFBOs();
      const alerts = this.fseconomyService.checkAlerts(fbos);

      let hasAlerts = false;
      let message = '<b>📊 Reporte Diario de Suministros</b>\n\n';

      // Alertas críticas (< 7 días)
      if (alerts.critical.length > 0) {
        hasAlerts = true;
        message += '🚨 <b>CRÍTICO - Acción Inmediata Requerida</b>\n';
        alerts.critical.forEach(fbo => {
          message += `• ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes (${fbo.supplies.toLocaleString()} gal)\n`;
        });
        message += '\n';
      }

      // Advertencias (7-30 días)
      if (alerts.warning.length > 0) {
        hasAlerts = true;
        message += '⚠️ <b>ADVERTENCIA - Planear Reabastecimiento</b>\n';
        alerts.warning.forEach(fbo => {
          message += `• ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes (${fbo.supplies.toLocaleString()} gal)\n`;
        });
        message += '\n';
      }

      // Informativas (30-60 días)
      if (alerts.info.length > 0) {
        message += 'ℹ️ <b>INFORMATIVO</b>\n';
        alerts.info.forEach(fbo => {
          message += `• ${fbo.icao}: <b>${fbo.daysOfSupplies}</b> días restantes\n`;
        });
        message += '\n';
      }

      // Si todo está bien
      if (!hasAlerts && alerts.info.length === 0) {
        message += '✅ ¡Todo en orden! Todos los FBOs tienen suministros adecuados.\n';
      }

      message += '\n<i>FSE Monitor - Reporte Automático</i>';

      await this.telegramService.sendMessage(this.chatId, message);
      console.log('✅ Reporte diario enviado exitosamente');
    } catch (error) {
      console.error('❌ Error en checkDailySupplies:', error.message);
      // Enviar alerta de fallo
      await this.telegramService.sendAlert(
        this.chatId,
        'Error en Reporte Diario',
        `No se pudo generar el reporte diario: ${error.message}`,
        'warning'
      );
    }
  }

  /**
   * Verificación crítica cada 6 horas
   * Solo alerta si hay FBOs con menos de 7 días de suministros
   */
  async checkCriticalAlerts() {
    try {
      const fbos = await this.fseconomyService.getMyFBOs();
      const alerts = this.fseconomyService.checkAlerts(fbos);

      // Solo alertar si hay situación crítica
      if (alerts.critical.length === 0) {
        console.log('✅ No hay alertas críticas');
        return;
      }

      let message = '🚨 <b>ALERTA CRÍTICA DE SUMINISTROS</b>\n\n';
      message += 'Los siguientes FBOs requieren atención INMEDIATA:\n\n';

      alerts.critical.forEach(fbo => {
        const urgency = fbo.daysOfSupplies <= 3 ? '🔴 URGENTE' : '⚠️ CRÍTICO';
        message += `${urgency} ${fbo.icao}\n`;
        message += `   Días restantes: <b>${fbo.daysOfSupplies}</b>\n`;
        message += `   Suministros: <b>${fbo.supplies.toLocaleString()}</b> gal\n`;
        message += `   Consumo diario: <b>${fbo.dailyConsumption.toFixed(1)}</b> gal/día\n\n`;
      });

      message += '<i>FSE Monitor - Alerta Automática</i>';

      await this.telegramService.sendAlert(
        this.chatId,
        'Alerta Crítica de Suministros',
        `${alerts.critical.length} FBO(s) con suministros críticos`,
        'critical'
      );

      await this.telegramService.sendMessage(this.chatId, message);
      console.log(`✅ Alerta crítica enviada para ${alerts.critical.length} FBO(s)`);
    } catch (error) {
      console.error('❌ Error en checkCriticalAlerts:', error.message);
    }
  }

  /**
   * Detiene todos los jobs (para graceful shutdown)
   */
  stopAllJobs() {
    cron.getScheduledTasks().forEach(task => task.stop());
    console.log('🛑 FSE Monitor Jobs detenidos');
  }
}

// Exportar instancia singleton
const fseMonitorJob = new FSEMonitorJob();

module.exports = fseMonitorJob;
