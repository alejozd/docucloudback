# 📋 Configuración del Telegram Bot para FSE Monitor

## 🔐 Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=tu_bot_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
TELEGRAM_WEBHOOK_URL=https://api.zdevs.uk/telegram/webhook

# FSEconomy API Keys
FSE_USERKEY=tu_userkey_aqui
FSE_READ_KEY=tu_read_key_aqui
```

### Cómo obtener cada variable:

#### 1. TELEGRAM_BOT_TOKEN
1. Abre Telegram y busca a [@BotFather](https://t.me/BotFather)
2. Envía `/newbot`
3. Sigue las instrucciones para crear tu bot
4. Copia el token que te proporciona

#### 2. TELEGRAM_CHAT_ID
1. Abre Telegram y busca a [@userinfobot](https://t.me/userinfobot)
2. Inicia el bot con `/start`
3. Te responderá con tu Chat ID (ej: `123456789`)

#### 3. FSE_USERKEY y FSE_READ_KEY
1. Inicia sesión en [FSEconomy](https://fseconomy.net)
2. Ve a `Settings` → `Data Feeds`
3. Tu `userkey` aparece en la página
4. Genera una `read key` si no tienes una

---

## 🚀 Comandos de Configuración

### 1. Instalar dependencias nuevas
```bash
cd /workspace
npm install xml2js node-cron express-rate-limit
```

### 2. Configurar Webhook (una sola vez)

**Opción A: Usando curl**
```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://api.zdevs.uk/telegram/webhook\"}"
```

**Opción B: Usando el endpoint interno**
```bash
curl -X POST https://api.zdevs.uk/telegram/setup-webhook
```

### 3. Verificar configuración del webhook
```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

O usando el endpoint interno:
```bash
curl https://api.zdevs.uk/telegram/webhook-info
```

### 4. Reiniciar aplicación con PM2
```bash
pm2 restart docucloudbackend
```

### 5. Ver logs
```bash
pm2 logs docucloudbackend --lines 100
```

---

## 🤖 Comandos Disponibles en Telegram

Una vez configurado, envía estos comandos a tu bot:

| Comando | Alias | Descripción |
|---------|-------|-------------|
| `/start` | - | Mensaje de bienvenida con menú |
| `/status` | `/fbo` | Lista de FBOs con suministros y estado |
| `/fleet` | `/aviones` | Estado de tu flota de aeronaves |
| `/alerts` | - | Resumen de alertas activas |
| `/help` | - | Lista de comandos disponibles |

---

## 📡 Endpoints HTTP

### POST /telegram/webhook
Endpoint principal para recibir updates de Telegram.
- **Método:** POST
- **Content-Type:** application/json
- **Rate Limit:** 100 requests/minuto

### POST /telegram/setup-webhook
Configura el webhook con Telegram API.
- **Método:** POST
- **Uso:** Solo desarrollo/deployment

### GET /telegram/webhook-info
Obtiene información del webhook actual.
- **Método:** GET
- **Uso:** Debugging

---

## ⏰ Jobs Automáticos (Solo Production)

El bot ejecuta automáticamente:

### 1. Reporte Diario (8:00 AM)
- Verifica todos los FBOs
- Envía resumen de suministros
- Alertas si hay FBOs con < 30 días

### 2. Verificación Crítica (cada 6 horas)
- Solo alerta si hay FBOs con < 7 días
- Notificación push inmediata

---

## 🧪 Pruebas Manuales

### Probar comando /start
1. Abre Telegram
2. Busca tu bot por @nombre_del_bot
3. Envía `/start`
4. Deberías recibir mensaje de bienvenida con botones

### Probar comando /status
1. Envía `/status` o `/fbo`
2. Deberías ver lista de FBOs con:
   - ICAO y nombre
   - Suministros actuales
   - Consumo diario
   - Días restantes
   - Ground fees

### Probar comando /fleet
1. Envía `/fleet` o `/aviones`
2. Deberías ver lista de aeronaves con:
   - Matrícula (registration)
   - Tipo
   - Ubicación
   - Horas totales y de motor

### Probar comando /alerts
1. Envía `/alerts`
2. Deberías ver resumen categorizado:
   - 🚨 Críticas (< 7 días)
   - ⚠️ Advertencias (7-30 días)
   - ℹ️ Informativas (30-60 días)

---

## 🛠️ Troubleshooting

### El bot no responde
1. Verifica que el webhook esté configurado:
   ```bash
   curl https://api.zdevs.uk/telegram/webhook-info
   ```
2. Revisa los logs:
   ```bash
   pm2 logs docucloudbackend
   ```
3. Verifica que las variables de entorno estén correctas

### Error "Variables de entorno incompletas"
Asegúrate de tener todas las variables en `.env`:
```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
FSE_USERKEY=...
FSE_READ_KEY=...
```

### FSEconomy API timeout
- La API de FSE puede estar lenta
- El timeout está configurado a 10 segundos
- Intenta nuevamente en unos minutos

### Webhook no recibe updates
1. Verifica que Cloudflare Tunnel esté activo
2. Asegúrate de que la URL sea HTTPS
3. Re-setup del webhook:
   ```bash
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -H "Content-Type: application/json" \
     -d "{\"url\": \"https://api.zdevs.uk/telegram/webhook\"}"
   ```

---

## 📁 Estructura de Archivos Creados

```
src/
├── config/
│   └── environment.js          # Validación de variables
├── services/
│   ├── telegram.service.js     # Comunicación con Telegram API
│   └── fseconomy.service.js    # Consulta a FSE Data Feeds
├── controllers/
│   └── telegram.controller.js  # Manejo de comandos
├── routes/
│   └── telegram.routes.js      # Endpoints HTTP
├── utils/
│   └── xml-parser.js           # Parser XML a JSON
├── jobs/
│   └── fse-monitor.job.js      # Cron jobs automáticos
└── index.js                    # (modificado) Montaje de rutas
```

---

## 🔒 Seguridad

- ✅ Rate limiting en webhook (100 req/min)
- ✅ Variables de entorno nunca hardcodeadas
- ✅ Graceful degradation si FSE falla
- ✅ Logging sin exponer tokens
- ✅ Timeout de 10s en llamadas HTTP
- ✅ Respuesta 200 obligatoria < 30s (requisito Telegram)

---

## 📝 Notas Adicionales

- El bot es para uso personal (chat_id único)
- Los Data Feeds de FSE son solo lectura
- Formato de mensajes: HTML parse_mode
- Jobs automáticos solo corren en NODE_ENV=production
- Si FSEconomy está caído, responde mensaje amigable

---

**¡Listo! 🎉 Tu bot de Telegram para monitorear FSEconomy está configurado.**
