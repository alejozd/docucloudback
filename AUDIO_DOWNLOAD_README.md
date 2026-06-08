# 📥 Módulo de Descarga de Audio desde YouTube (Asíncrono)

## Descripción

Módulo asíncrono para descargar audio desde YouTube y convertirlo a MP3. Diseñado específicamente para evitar timeouts de Cloudflare (límite de 100 segundos) mediante descargas en segundo plano con polling de estado.

## Flujo de Trabajo

```
┌─────────┐      POST /download       ┌──────────┐
│ Cliente │ ────────────────────────> │ Servidor │
└─────────┘                           └──────────┘
     │                                      │
     │         202 Accepted                 │
     │    { filename, statusUrl }           │
     │ <────────────────────────            │
     │                                      │
     │   GET /status/:filename (polling)    │
     │ ────────────────────────────────>    │
     │         { status: "downloading" }    │
     │ <───────────────────────────────     │
     │                                      │
     │   GET /status/:filename (polling)    │
     │ ────────────────────────────────>    │
     │         { status: "completed" }      │
     │ <───────────────────────────────     │
     │                                      │
     │   GET /download/:filename            │
     │ ────────────────────────────────>    │
     │         [Archivo MP3]                │
     │ <───────────────────────────────     │
```

## Archivos del Módulo

```
src/
├── services/
│   └── ytDlpService.js           # Servicio que ejecuta yt-dlp en background
├── controllers/
│   └── audioDownloadController.js # Controlador con lógica asíncrona
└── routes/
    └── audioDownloadRoutes.js     # Rutas del módulo

downloads/
└── audios/                        # Carpeta donde se guardan los MP3
```

## Dependencias Requeridas

### 1. Instalar yt-dlp en el servidor (REQUERIDO)

El módulo usa `yt-dlp` externamente. Instálalo en tu servidor Ubuntu:

```bash
# Descargar e instalar yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp

# Dar permisos de ejecución
sudo chmod a+rx /usr/local/bin/yt-dlp

# Verificar instalación
yt-dlp --version
```

### 2. No se requieren paquetes npm adicionales

El módulo usa solo librerías nativas de Node.js (`child_process`, `fs`, `path`).

## Configuración

### Variable de Entorno (Opcional)

Agrega esta línea a tu archivo `.env` si quieres cambiar la ruta de descargas:

```env
AUDIO_DOWNLOAD_PATH=/var/www/audio_downloads
```

Si no la especificas, se usará por defecto: `./downloads/audios`

La carpeta se crea automáticamente al iniciar el servidor.

## Endpoints Disponibles

Todos los endpoints están protegidos con autenticación por API Key.

---

### 1. Iniciar Descarga de Audio (NO BLOQUEANTE)

**POST** `/api/audio-download/download`

Inicia la descarga en segundo plano y retorna **inmediatamente** con código `202 Accepted`.

**Headers:**
```
x-api-key: tu-zam-api-key
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Respuesta Exitosa (202):**
```json
{
  "success": true,
  "message": "Descarga iniciada en segundo plano",
  "filename": "video_dQw4w9WgXcQ.mp3",
  "status": "downloading",
  "statusUrl": "/api/audio-download/status/video_dQw4w9WgXcQ.mp3",
  "downloadUrl": "/api/audio-download/download/video_dQw4w9WgXcQ.mp3"
}
```

**Respuesta de Error (400/500):**
```json
{
  "success": false,
  "error": "Descripción del error"
}
```

---

### 2. Verificar Estado de Descarga (POLLING)

**GET** `/api/audio-download/status/:filename`

Verifica el estado actual de una descarga en curso.

**Headers:**
```
x-api-key: tu-zam-api-key
```

**Respuestas Posibles:**

**a) Descarga en progreso:**
```json
{
  "success": true,
  "status": "downloading",
  "filename": "video_dQw4w9WgXcQ.mp3",
  "progress": 45.5,
  "startedAt": "2025-01-15T10:30:00.000Z"
}
```

**b) Descarga completada:**
```json
{
  "success": true,
  "status": "completed",
  "filename": "video_dQw4w9WgXcQ.mp3",
  "size": 5242880,
  "sizeFormatted": "5 MB",
  "progress": 100,
  "startedAt": "2025-01-15T10:30:00.000Z",
  "completedAt": "2025-01-15T10:32:00.000Z"
}
```

**c) Descarga fallida:**
```json
{
  "success": true,
  "status": "failed",
  "filename": "video_dQw4w9WgXcQ.mp3",
  "error": "URL no disponible",
  "startedAt": "2025-01-15T10:30:00.000Z"
}
```

**d) Archivo no encontrado:**
```json
{
  "success": true,
  "status": "not_found",
  "filename": "video_dQw4w9WgXcQ.mp3"
}
```

---

### 3. Listar Archivos MP3 Descargados

**GET** `/api/audio-download/files`

Lista todos los archivos MP3 completados en el servidor.

**Headers:**
```
x-api-key: tu-zam-api-key
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "count": 3,
  "files": [
    {
      "name": "Cancion_Ejemplo.mp3",
      "size": 5242880,
      "sizeFormatted": "5 MB",
      "createdAt": "2025-01-15T10:32:00.000Z",
      "modifiedAt": "2025-01-15T10:32:00.000Z",
      "downloadUrl": "/api/audio-download/download/Cancion_Ejemplo.mp3"
    }
  ]
}
```

---

### 4. Descargar un Archivo MP3 Específico

**GET** `/api/audio-download/download/:filename`

Descarga el archivo MP3 cuando el estado es "completed".

**Headers:**
```
x-api-key: tu-zam-api-key
```

**Ejemplo:**
```
GET /api/audio-download/download/video_dQw4w9WgXcQ.mp3
```

**Respuesta:** El archivo MP3 se descarga directamente (binary stream).

---

### 5. Eliminar un Archivo MP3

**DELETE** `/api/audio-download/delete/:filename`

Elimina un archivo MP3 del servidor.

**Headers:**
```
x-api-key: tu-zam-api-key
```

**Ejemplo:**
```
DELETE /api/audio-download/delete/Cancion_Ejemplo.mp3
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Archivo \"Cancion_Ejemplo.mp3\" eliminado exitosamente"
}
```

---

## Ejemplos de Prueba con cURL

### 1. Iniciar Descarga (Retorna inmediatamente)

```bash
curl -X POST http://localhost:3100/api/audio-download/download \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-zam-api-key" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Respuesta:**
```json
{
  "success": true,
  "filename": "video_dQw4w9WgXcQ.mp3",
  "status": "downloading",
  "statusUrl": "/api/audio-download/status/video_dQw4w9WgXcQ.mp3"
}
```

### 2. Verificar Estado (Polling cada 5 segundos)

```bash
# Primer check (a los 5 segundos)
curl -X GET http://localhost:3100/api/audio-download/status/video_dQw4w9WgXcQ.mp3 \
  -H "x-api-key: tu-zam-api-key"

# Respuesta: {"status": "downloading", "progress": 30}

# Segundo check (a los 10 segundos)
curl -X GET http://localhost:3100/api/audio-download/status/video_dQw4w9WgXcQ.mp3 \
  -H "x-api-key: tu-zam-api-key"

# Respuesta: {"status": "downloading", "progress": 75}

# Tercer check (a los 15 segundos)
curl -X GET http://localhost:3100/api/audio-download/status/video_dQw4w9WgXcQ.mp3 \
  -H "x-api-key: tu-zam-api-key"

# Respuesta: {"status": "completed", "size": 5242880}
```

### 3. Descargar Archivo (cuando status = completed)

```bash
curl -X GET http://localhost:3100/api/audio-download/download/video_dQw4w9WgXcQ.mp3 \
  -H "x-api-key: tu-zam-api-key" \
  -o downloaded_audio.mp3
```

### 4. Listar Archivos Descargados

```bash
curl -X GET http://localhost:3100/api/audio-download/files \
  -H "x-api-key: tu-zam-api-key"
```

### 5. Eliminar un Archivo

```bash
curl -X DELETE http://localhost:3100/api/audio-download/delete/video_dQw4w9WgXcQ.mp3 \
  -H "x-api-key: tu-zam-api-key"
```

---

## Ejemplos de Prueba con Postman

### Colección de Requests

#### 1. Iniciar Descarga
- **Method:** POST
- **URL:** `http://localhost:3100/api/audio-download/download`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: tu-zam-api-key`
- **Body (raw JSON):**
  ```json
  {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
  ```
- **Guardar** el `filename` de la respuesta

#### 2. Verificar Estado (Polling)
- **Method:** GET
- **URL:** `http://localhost:3100/api/audio-download/status/{{filename}}`
- **Headers:**
  - `x-api-key: tu-zam-api-key`
- **Repetir** cada 5 segundos hasta que `status` sea "completed"

#### 3. Descargar Archivo
- **Method:** GET
- **URL:** `http://localhost:3100/api/audio-download/download/{{filename}}`
- **Headers:**
  - `x-api-key: tu-zam-api-key`
- **Configurar:** "Save Response to File" en la pestaña Settings

#### 4. Listar Archivos
- **Method:** GET
- **URL:** `http://localhost:3100/api/audio-download/files`
- **Headers:**
  - `x-api-key: tu-zam-api-key`

#### 5. Eliminar Archivo
- **Method:** DELETE
- **URL:** `http://localhost:3100/api/audio-download/delete/{{filename}}`
- **Headers:**
  - `x-api-key: tu-zam-api-key`

---

## Script de Polling Automático (JavaScript/Node.js)

```javascript
const axios = require('axios');

async function downloadWithPolling(videoUrl, apiKey) {
  const BASE_URL = 'http://localhost:3100/api/audio-download';
  
  // 1. Iniciar descarga
  console.log('📥 Iniciando descarga...');
  const startResponse = await axios.post(
    `${BASE_URL}/download`,
    { url: videoUrl },
    { headers: { 'x-api-key': apiKey } }
  );
  
  const { filename, statusUrl } = startResponse.data;
  console.log(`✅ Descarga iniciada. Filename: ${filename}`);
  
  // 2. Polling para verificar estado
  let status = 'downloading';
  while (status === 'downloading') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
    
    const statusResponse = await axios.get(
      `${BASE_URL}/status/${filename}`,
      { headers: { 'x-api-key': apiKey } }
    );
    
    status = statusResponse.data.status;
    console.log(`📊 Estado: ${status} (${statusResponse.data.progress || 0}%)`);
    
    if (status === 'failed') {
      throw new Error(`Descarga fallida: ${statusResponse.data.error}`);
    }
  }
  
  // 3. Descargar archivo
  console.log('⬇️  Descargando archivo...');
  const fileResponse = await axios.get(
    `${BASE_URL}/download/${filename}`,
    { 
      headers: { 'x-api-key': apiKey },
      responseType: 'stream'
    }
  );
  
  // Guardar archivo o procesar stream
  return { filename, size: statusResponse.data.size };
}

// Uso
downloadWithPolling(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'tu-zam-api-key'
).then(result => {
  console.log('✅ Descarga completada:', result);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
```

---

## Reiniciar el Servidor con PM2

Después de implementar los cambios:

```bash
# Ir al directorio del proyecto
cd /workspace

# (Opcional) Verificar que no hay errores de sintaxis
node -c src/index.js

# Reiniciar la aplicación en PM2
pm2 restart nombre-de-tu-app

# Verificar estado
pm2 status

# Ver logs en tiempo real
pm2 logs nombre-de-tu-app --lines 50
```

## Seguridad Implementada

✅ **Validación de URL**: Solo se aceptan URLs de youtube.com o youtu.be  
✅ **Sanitización de nombres**: Se eliminan caracteres peligrosos  
✅ **Path traversal prevention**: Uso de `path.basename()` para evitar acceso a otras carpetas  
✅ **Autenticación por API Key**: Todas las rutas requieren `x-api-key` válido  
✅ **Timeout extendido**: Las descargas en background tienen timeout de 10 minutos  
✅ **Logs detallados**: Todos los procesos quedan registrados para debugging  
✅ **Sin bloqueo**: El endpoint POST retorna inmediatamente (202 Accepted)  

---

## Logs y Debugging

El módulo genera logs con los prefijos:
- `[ytDlpService]` - Servicio de descarga
- `[ytDlpService] [BG]` - Descargas en segundo plano
- `[audioDownloadController]` - Controlador

Para verlos en tiempo real:

```bash
pm2 logs nombre-de-tu-app | grep -E "(ytDlpService|audioDownloadController)"
```

---

## Solución de Problemas

### Error: "yt-dlp no está instalado"

```bash
# Instalar yt-dlp
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### Error: "URL inválida"

Asegúrate de usar URLs válidas de YouTube:
- ✅ `https://www.youtube.com/watch?v=XXXXX`
- ✅ `https://youtu.be/XXXXX`
- ✅ `https://www.youtube.com/shorts/XXXXX`
- ❌ `https://vimeo.com/XXXXX` (no soportado)

### La descarga nunca completa

Verifica los logs del servidor. Puede ser:
- Conexión lenta a internet
- Video muy largo (>1 hora)
- Restricciones geográficas del video

### Timeout después de 10 minutos

Videos extremadamente largos pueden exceder el timeout. Considera:
- Dividir videos largos en segmentos
- Aumentar el timeout en `ytDlpService.js`

---

## Notas Importantes

⚠️ **Uso responsable**: Este módulo es para uso personal. Respeta los derechos de autor y los términos de servicio de YouTube.

⚠️ **Espacio en disco**: Los archivos de audio se acumulan en el servidor. Implementa una política de limpieza periódica si es necesario.

⚠️ **Cloudflare**: Este módulo está diseñado específicamente para evitar el límite de 100 segundos de Cloudflare mediante descargas asíncronas con polling.

⚠️ **Memoria**: El estado de las descargas se mantiene en memoria (Map). Si reinicias el servidor, perderás el tracking de descargas en curso (pero los archivos completados permanecerán).

---

## Comparación: Antes vs Después

### ANTES (Bloqueante - Causa Timeout)

```
Cliente → POST /download ─────[espera 150 segundos]─────→ 200 OK o 524 Timeout
                                                        (Cloudflare cierra)
```

### DESPUÉS (Asíncrono - Sin Timeout)

```
Cliente → POST /download ──→ 202 Accepted (inmediato)
         GET /status ──────→ "downloading" (5s)
         GET /status ──────→ "downloading" (10s)
         GET /status ──────→ "completed" (15s)
         GET /download ────→ 200 OK + archivo
```
