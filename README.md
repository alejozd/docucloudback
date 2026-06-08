# docucloudback
backend de docucloud, aplicacion nodejs  - express

---

## 📥 Módulo de Descarga de Audio (YouTube a MP3)

Este módulo permite descargar audio desde YouTube y convertirlo a MP3 utilizando `yt-dlp`.

### 🔐 Autenticación

El endpoint está protegido mediante **API Key**. Debes incluir tu API Key en los headers de cada petición.

**Opciones de autenticación:**

1. **Header `x-api-key`** (recomendado):
   ```
   x-api-key: tu-zam-api-key
   ```

2. **Header `Authorization: Bearer`**:
   ```
   Authorization: Bearer tu-zam-api-key
   ```

### ⚙️ Configuración

Asegúrate de tener configurada la variable de entorno `ZAM_API_KEY` en tu archivo `.env`:

```env
ZAM_API_KEY=tu-api-key-secreta-cambia-esto
AUDIO_DOWNLOAD_PATH=/var/www/audio_downloads
```

### 📋 Endpoints

#### 1. Descargar audio desde YouTube

**POST** `/api/audio-download/download`

Descarga el audio de un video de YouTube y lo convierte a MP3.

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=XXXXX"
}
```

**Ejemplo con cURL:**
```bash
curl -X POST http://localhost:3100/api/audio-download/download \
  -H "Content-Type: application/json" \
  -H "x-api-key: tu-zam-api-key" \
  -d '{"url":"https://www.youtube.com/watch?v=XXXXX"}'
```

**Ejemplo con Authorization Bearer:**
```bash
curl -X POST http://localhost:3100/api/audio-download/download \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu-zam-api-key" \
  -d '{"url":"https://www.youtube.com/watch?v=XXXXX"}'
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Audio descargado exitosamente",
  "filename": "nombre_archivo.mp3",
  "downloadUrl": "/api/audio-download/download/nombre_archivo.mp3"
}
```

---

#### 2. Listar archivos descargados

**GET** `/api/audio-download/files`

Lista todos los archivos MP3 descargados disponibles.

**Ejemplo con cURL:**
```bash
curl -X GET http://localhost:3100/api/audio-download/files \
  -H "x-api-key: tu-zam-api-key"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 2,
  "files": [
    {
      "name": "archivo1.mp3",
      "size": 5242880,
      "sizeFormatted": "5 MB",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "modifiedAt": "2025-01-15T10:30:00.000Z",
      "downloadUrl": "/api/audio-download/download/archivo1.mp3"
    }
  ]
}
```

---

#### 3. Descargar un archivo MP3 específico

**GET** `/api/audio-download/download/:filename`

Descarga un archivo MP3 que fue previamente descargado.

**Ejemplo con cURL:**
```bash
curl -X GET http://localhost:3100/api/audio-download/download/mi_archivo.mp3 \
  -H "x-api-key: tu-zam-api-key" \
  --output mi_archivo.mp3
```

---

#### 4. Eliminar un archivo MP3

**DELETE** `/api/audio-download/delete/:filename`

Elimina un archivo MP3 del servidor.

**Ejemplo con cURL:**
```bash
curl -X DELETE http://localhost:3100/api/audio-download/delete/mi_archivo.mp3 \
  -H "x-api-key: tu-zam-api-key"
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Archivo \"mi_archivo.mp3\" eliminado exitosamente"
}
```

---

### 🔧 Ejemplos para Postman

**Configuración de Headers en Postman:**

1. Ve a la pestaña **Headers**
2. Agrega:
   - Key: `x-api-key` | Value: `tu-zam-api-key`
   
   **O alternativamente:**
   - Key: `Authorization` | Value: `Bearer tu-zam-api-key`

**Ejemplo de petición POST (Descargar):**

- Method: `POST`
- URL: `http://localhost:3100/api/audio-download/download`
- Headers:
  - `Content-Type: application/json`
  - `x-api-key: tu-zam-api-key`
- Body (raw JSON):
  ```json
  {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
  ```

---

### ❌ Códigos de Error

| Código | Descripción |
|--------|-------------|
| 400    | URL inválida o faltante |
| 401    | API Key inválida o no proporcionada |
| 404    | Archivo no encontrado |
| 500    | Error interno del servidor |

**Ejemplo de error 401:**
```json
{
  "success": false,
  "error": "API Key inválida"
}
```

