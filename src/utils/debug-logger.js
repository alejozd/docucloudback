// src/utils/debug-logger.js

/**
 * Logger condicional basado en variables de entorno DEBUG_*
 * Uso: debug.log('TELEGRAM', 'Mensaje', datos)
 */

const DEBUG_FLAGS = {
  TELEGRAM: process.env.DEBUG_TELEGRAM === 'true',
  FSE: process.env.DEBUG_FSE === 'true',
  PARSER: process.env.DEBUG_PARSER === 'true',
  JOBS: process.env.DEBUG_JOBS === 'true'
};

class DebugLogger {
  static log(module, message, data = null) {
    const flag = DEBUG_FLAGS[module.toUpperCase()];
    if (!flag) return;
    
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `🔍 [DEBUG:${module.toUpperCase()}]`;
    
    if (data !== null) {
      console.log(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.log(`${timestamp} ${prefix} ${message}`);
    }
  }
  
  static warn(module, message, data = null) {
    // Las advertencias SIEMPRE se loguean
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `⚠️ [WARN:${module.toUpperCase()}]`;
    
    if (data !== null) {
      console.warn(`${timestamp} ${prefix} ${message}`, data);
    } else {
      console.warn(`${timestamp} ${prefix} ${message}`);
    }
  }
  
  static error(module, message, error = null) {
    // Los errores SIEMPRE se loguean, independientemente del flag
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = `❌ [ERROR:${module.toUpperCase()}]`;
    
    if (error instanceof Error) {
      console.error(`${timestamp} ${prefix} ${message}`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3)
      });
    } else {
      console.error(`${timestamp} ${prefix} ${message}`, error);
    }
  }
  
  static isEnabled(module) {
    return DEBUG_FLAGS[module.toUpperCase()] === true;
  }
}

module.exports = DebugLogger;
