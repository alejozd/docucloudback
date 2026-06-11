# Documentación de Endpoints de Mejora de Audio

Esta documentación detalla los nuevos endpoints implementados para el procesamiento post-descarga de archivos de audio (MP3). Estos endpoints permiten aplicar ganancia de volumen y dividir archivos en segmentos de forma asíncrona.

---

## 1. Iniciar Procesamiento de Audio

Inicia una tarea de procesamiento en segundo plano. El servidor responderá inmediatamente con un `taskId` para que el frontend pueda consultar el estado.

- **URL:** `/api/audio-download/process`
- **Método:** `POST`
- **Autenticación:** Requiere API Key (`x-api-key` o `Authorization: Bearer`).
- **Cuerpo (JSON):**

```json
{
  "filename": "nombre_archivo_existente.mp3",
  "operations": [
    {
      "type": "volume",
      "level": 6
    },
    {
      "type": "split",
      "interval": 30
    }
  ]
}
```

### Especificación de Operaciones:

1. **Aumento de Volumen (`type: "volume"`):**
   - `level`: Número que indica la ganancia en decibelios (dB). Recomendado: 1 a 15.
   - Genera un archivo con sufijo `_TASKID_vol+Xdb.mp3` (donde TASKID son los primeros 8 caracteres del ID de tarea).

2. **División de Audio (`type: "split"`):**
   - `interval`: Número en minutos para cada segmento.
   - Genera archivos numerados con sufijo `_TASKID_parte1.mp3`, `_TASKID_parte2.mp3`, etc.
   - Si se combina con volumen, la división se aplica sobre el archivo con volumen ya aplicado.

- **Respuesta Exitosa (202 Accepted):**

```json
{
  "success": true,
  "message": "Procesamiento iniciado en segundo plano",
  "taskId": "uuid-v4-de-la-tarea",
  "status": "pending",
  "statusUrl": "/api/audio-download/process-status/uuid-v4-de-la-tarea"
}
```

---

## 2. Consultar Estado de Procesamiento

Permite al frontend monitorear el progreso de una tarea y obtener el listado de archivos generados al finalizar.

- **URL:** `/api/audio-download/process-status/:taskId`
- **Método:** `GET`
- **Autenticación:** Requiere API Key.
- **Parámetros de URL:**
  - `taskId`: El ID único retornado por el endpoint de inicio.

- **Respuesta en Progreso (200 OK):**

```json
{
  "success": true,
  "id": "uuid-v4-de-la-tarea",
  "originalFilename": "nombre_archivo.mp3",
  "status": "processing",
  "progress": 45,
  "generatedFiles": ["nombre_archivo_vol+6db.mp3"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "startedAt": "2025-01-15T10:00:01.000Z"
}
```

- **Respuesta Completada (200 OK):**

```json
{
  "success": true,
  "id": "uuid-v4-de-la-tarea",
  "status": "completed",
  "progress": 100,
  "generatedFiles": [
    "nombre_archivo_vol+6db.mp3",
    "nombre_archivo_vol+6db_parte1.mp3",
    "nombre_archivo_vol+6db_parte2.mp3"
  ],
  "completedAt": "2025-01-15T10:05:00.000Z"
}
```

- **Respuesta Fallida (200 OK):**

```json
{
  "success": true,
  "status": "failed",
  "error": "Mensaje detallado del error (ej. Espacio en disco insuficiente)",
  "generatedFiles": []
}
```

---

## Consideraciones Adicionales

1. **Persistencia:** Los archivos generados aparecen automáticamente en el listado de `GET /api/audio-download/files`.
2. **Streaming/Descarga:** Los archivos generados pueden ser consumidos mediante el endpoint existente `/api/audio-download/download/:filename`.
3. **Límite de Concurrencia:** El servidor procesa un máximo de 2 tareas simultáneamente. Las demás quedan en estado `pending` en una cola FIFO.
4. **Validación:** El sistema verifica que el archivo original exista y que haya espacio suficiente en disco (aprox. 3x el tamaño original) antes de procesar.
