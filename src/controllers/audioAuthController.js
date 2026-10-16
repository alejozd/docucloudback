const audioSessionService = require("../services/audioSessionService");

/**
 * Controlador de sesiones para el módulo "Audios YouTube".
 *
 * POST /api/audio-download/session  -> valida la clave y emite un token de 24h
 * GET  /api/audio-download/session  -> valida un token existente (Bearer)
 *
 * Ambas rutas son públicas (no llevan apiKeyAuth) porque su propósito es
 * justamente obtener/verificar el acceso al módulo. La clave NUNCA se compara
 * en el navegador: solo aquí, en el servidor, y en tiempo constante.
 */

const createSession = (req, res) => {
  const { password } = req.body || {};

  const result = audioSessionService.verifyPassword(password);

  if (!result.ok) {
    if (result.reason === "not_configured") {
      console.error(
        "[audioAuth] No hay clave configurada: define AUDIO_ACCESS_PASSWORD o ZAM_API_KEY",
      );
      return res.status(500).json({
        ok: false,
        error: "El servidor no tiene configurada la clave de acceso al módulo",
      });
    }

    console.warn("[audioAuth] Clave de acceso incorrecta");
    // Mensaje genérico a propósito: no revela longitud ni formato de la clave.
    return res.status(401).json({
      ok: false,
      error: "Clave de acceso incorrecta",
    });
  }

  try {
    const { token, expiresAt } = audioSessionService.createSession(
      audioSessionService.DEFAULT_DURATION_HOURS,
    );

    return res.json({
      ok: true,
      token,
      expiresAt,
      expiresInHours: audioSessionService.DEFAULT_DURATION_HOURS,
    });
  } catch (error) {
    console.error("[audioAuth] Error creando sesión:", error.message);
    return res.status(500).json({
      ok: false,
      error: "No se pudo crear la sesión",
    });
  }
};

const getSession = (req, res) => {
  const authHeader = req.headers["authorization"] || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({
      ok: false,
      error: "Token de sesión requerido. Usa: Authorization: Bearer <token>",
    });
  }

  const result = audioSessionService.verifySession(token);

  if (!result.valid) {
    return res.status(401).json({
      ok: false,
      error:
        result.reason === "expired"
          ? "La sesión expiró. Vuelve a ingresar la clave."
          : "Sesión inválida",
      reason: result.reason,
    });
  }

  return res.json({
    ok: true,
    expiresAt: result.expiresAt,
  });
};

module.exports = {
  createSession,
  getSession,
};
