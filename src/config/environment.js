/**
 * Validación de variables de entorno para el módulo de Telegram Bot
 * Valida que existan las variables críticas para el funcionamiento del bot
 */

const validateTelegramEnv = () => {
  const requiredVars = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'FSE_USERKEY',
    'FSE_READ_KEY'
  ];

  const missingVars = [];

  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // En production, lanzar error si faltan variables críticas
  if (process.env.NODE_ENV === 'production' && missingVars.length > 0) {
    throw new Error(
      `❌ Faltan variables de entorno críticas para Telegram Bot: ${missingVars.join(', ')}. ` +
      'El bot no se inicializará.'
    );
  }

  // Warn en development si faltan variables
  if (process.env.NODE_ENV !== 'production' && missingVars.length > 0) {
    console.warn(
      `⚠️  Advertencia: Faltan variables de entorno para Telegram Bot: ${missingVars.join(', ')}. ` +
      'El bot no funcionará correctamente.'
    );
    return false;
  }

  // Validar URL del webhook
  if (!process.env.TELEGRAM_WEBHOOK_URL) {
    console.warn('⚠️  TELEGRAM_WEBHOOK_URL no definida. Usando valor por defecto.');
    process.env.TELEGRAM_WEBHOOK_URL = 'https://api.zdevs.uk/telegram/webhook';
  }

  console.log('✅ Variables de entorno de Telegram Bot validadas correctamente');
  return true;
};

module.exports = { validateTelegramEnv };
