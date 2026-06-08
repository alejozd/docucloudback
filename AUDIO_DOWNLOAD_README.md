# 📥 Módulo de Descarga de Audio desde YouTube

## Archivos Creados

Se han creado los siguientes archivos nuevos **sin modificar ningún archivo existente**:

```
src/
├── services/
│   └── ytDlpService.js           # Servicio que ejecuta yt-dlp
├── controllers/
│   └── audioDownloadController.js # Controlador con la lógica
└── routes/
    └── audioDownloadRoutes.js     # Rutas del módulo

downloads/
└── audios/                        # Carpeta donde se guardan los MP3
```

## Cambios en `src/index.js`

Se agregaron 2 líneas al archivo principal:

1. **Línea 77** - Importación del router:
```javascript
const audioDownloadRoutes = require("./routes/audioDownloadRoutes");
```

2. **Líneas 207-209** - Registro de rutas:
```javascript
// Montar rutas de descarga de audio desde YouTube
app.use("/api/audio-download", audioDownloadRoutes);
console.log('✅ Audio download routes mounted at /api/audio-download');
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

Todos los endpoints están protegidos con autenticación JWT y usan el prefijo `/api/audio-download`.

### 1. Descargar Audio desde YouTube

**POST** `/api/audio-download/download`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Audio descargado exitosamente",
  "filename": "Nombre_del_Video.mp3",
  "downloadUrl": "/api/audio-download/download/Nombre_del_Video.mp3"
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

### 2. Listar Archivos MP3 Descargados

**GET** `/api/audio-download/files`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
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
      "createdAt": "2025-06-08T18:30:00.000Z",
      "modifiedAt": "2025-06-08T18:30:00.000Z",
      "downloadUrl": "/api/audio-download/download/Cancion_Ejemplo.mp3"
    }
  ]
}
```

---

### 3. Descargar un Archivo MP3 Específico

**GET** `/api/audio-download/download/:filename`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
```

**Ejemplo:**
```
GET /api/audio-download/download/Mi_Cancion.mp3
```

**Respuesta:** El archivo MP3 se descarga directamente (binary stream).

---

### 4. Eliminar un Archivo MP3

**DELETE** `/api/audio-download/delete/:filename`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
```

**Ejemplo:**
```
DELETE /api/audio-download/delete/Mi_Cancion.mp3
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Archivo \"Mi_Cancion.mp3\" eliminado exitosamente"
}
```

## Ejemplos de Prueba con cURL

### 1. Obtener Token JWT (si no tienes uno)

```bash
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@email.com","password":"tu-password"}'
```

Guarda el token de la respuesta.

### 2. Descargar Audio desde YouTube

```bash
curl -X POST http://localhost:3100/api/audio-download/download \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

### 3. Listar Archivos Descargados

```bash
curl -X GET http://localhost:3100/api/audio-download/files \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

### 4. Descargar un Archivo MP3

```bash
curl -X GET http://localhost:3100/api/audio-download/download/NOMBRE_DEL_ARCHIVO.mp3 \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI" \
  -o downloaded_audio.mp3
```

### 5. Eliminar un Archivo

```bash
curl -X DELETE http://localhost:3100/api/audio-download/delete/NOMBRE_DEL_ARCHIVO.mp3 \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

## Ejemplos de Prueba con Postman

### Colección de Requests

1. **Descargar Audio**
   - Method: POST
   - URL: `http://localhost:3100/api/audio-download/download`
   - Headers:
     - `Content-Type: application/json`
     - `Authorization: Bearer {{jwt_token}}`
   - Body (raw JSON):
     ```json
     {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
     ```

2. **Listar Archivos**
   - Method: GET
   - URL: `http://localhost:3100/api/audio-download/files`
   - Headers:
     - `Authorization: Bearer {{jwt_token}}`

3. **Descargar Archivo**
   - Method: GET
   - URL: `http://localhost:3100/api/audio-download/download/NOMBRE_ARCHIVO.mp3`
   - Headers:
     - `Authorization: Bearer {{jwt_token}}`
   - Configura "Save Response to File" en Postman

4. **Eliminar Archivo**
   - Method: DELETE
   - URL: `http://localhost:3100/api/audio-download/delete/NOMBRE_ARCHIVO.mp3`
   - Headers:
     - `Authorization: Bearer {{jwt_token}}`

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
✅ **Autenticación JWT**: Todas las rutas requieren token válido  
✅ **Timeout**: Las descargas tienen timeout de 5 minutos  
✅ **Logs**: Todos los procesos quedan registrados para debugging  

## Logs y Debugging

El módulo genera logs con el prefijo `[ytDlpService]` y `[audioDownloadController]`.

Para verlos en tiempo real:

```bash
pm2 logs nombre-de-tu-app | grep -E "(ytDlpService|audioDownloadController)"
```

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

### Error: "Tiempo de espera agotado"

La descarga tomó más de 5 minutos. Esto puede pasar con videos muy largos o conexiones lentas.

### La carpeta de descargas no se crea

Verifica que el proceso tenga permisos de escritura en el directorio del proyecto.

## Notas Importantes

⚠️ **Uso responsable**: Este módulo es para uso personal. Respeta los derechos de autor y los términos de servicio de YouTube.

⚠️ **Espacio en disco**: Los archivos de audio se acumulan en el servidor. Implementa una política de limpieza periódica si es necesario.

⚠️ **Rendimiento**: Las descargas son operaciones bloqueantes. Para producción con alto tráfico, considera usar colas de trabajo (ej. Bull + Redis).
