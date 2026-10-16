const crypto = require("crypto");

/**
 * Servicio de sesiones para el módulo "Audios YouTube" (Utilidades).
 *
 * Problema que resuelve: antes el frontend comparaba la clave contra
 * REACT_APP_API_KEY (compilada dentro del bundle JS) y guardaba un simple
 * "true" en sessionStorage. Eso significaba:
 *   1. La clave era pública (visible en el bundle).
 *   2. El acceso se perdía al cerrar la pestaña o abrir una nueva.
 *   3. No existía vencimiento alguno.
 *
 * Ahora el backend valida la clave y emite un token firmado con HMAC-SHA256
 * que el dispositivo guarda por 24 horas. El token no se puede falsificar sin
 * el secreto del servidor y expira de forma verificable en el servidor.
 */

const DEFAULT_DURATION_HOURS = 24;

/**
 * Secreto usado para firmar los tokens de sesión.
 * Se prefiere AUDIO_SESSION_SECRET para poder rotar el acceso al módulo sin
 * cambiar la API key general (ZAM_API_KEY) que usan el resto de las llamadas.
 */
function getSecret() {
  return process.env.AUDIO_SESSION_SECRET || process.env.ZAM_API_KEY || null;
}

/**
 * Clave de acceso al módulo. Por compatibilidad cae a ZAM_API_KEY si no se
 * define AUDIO_ACCESS_PASSWORD, de modo que el despliegue actual siga
 * funcionando sin cambios de configuración.
 */
function getExpectedPassword() {
  return process.env.AUDIO_ACCESS_PASSWORD || process.env.ZAM_API_KEY || null;
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + padding, "base64");
}

function sign(payloadEncoded, secret) {
  return base64UrlEncode(
    crypto.createHmac("sha256", secret).update(payloadEncoded).digest(),
  );
}

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Compara la clave recibida contra la esperada en tiempo constante.
 * @returns {{ ok: boolean, reason?: 'not_configured' | 'mismatch' }}
 */
function verifyPassword(providedPassword) {
  const expected = getExpectedPassword();

  if (!expected) {
    return { ok: false, reason: "not_configured" };
  }

  if (typeof providedPassword !== "string" || providedPassword.length === 0) {
    return { ok: false, reason: "mismatch" };
  }

  if (!timingSafeEqualStrings(providedPassword, expected)) {
    return { ok: false, reason: "mismatch" };
  }

  return { ok: true };
}

/**
 * Crea una sesión firmada.
 * @param {number} durationHours - Duración en horas (default 24)
 * @returns {{ token: string, expiresAt: string, expiresAtMs: number }}
 */
function createSession(durationHours = DEFAULT_DURATION_HOURS) {
  const secret = getSecret();

  if (!secret) {
    throw new Error(
      "No hay secreto configurado para firmar sesiones (AUDIO_SESSION_SECRET o ZAM_API_KEY)",
    );
  }

  const now = Date.now();
  const expiresAtMs = now + durationHours * 60 * 60 * 1000;

  const payloadEncoded = base64UrlEncode(
    JSON.stringify({
      iat: now,
      exp: expiresAtMs,
      jti: crypto.randomBytes(8).toString("hex"),
    }),
  );

  const token = `${payloadEncoded}.${sign(payloadEncoded, secret)}`;

  return {
    token,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
  };
}

/**
 * Verifica un token de sesión.
 * @param {string} token
 * @returns {{ valid: true, expiresAt: string, expiresAtMs: number } | { valid: false, reason: string }}
 */
function verifySession(token) {
  const secret = getSecret();

  if (!secret) {
    return { valid: false, reason: "not_configured" };
  }

  if (typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "malformed" };
  }

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) {
    return { valid: false, reason: "malformed" };
  }

  const expectedSignature = sign(payloadEncoded, secret);
  if (!timingSafeEqualStrings(signature, expectedSignature)) {
    return { valid: false, reason: "bad_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadEncoded).toString("utf8"));
  } catch (error) {
    return { valid: false, reason: "malformed" };
  }

  if (typeof payload?.exp !== "number") {
    return { valid: false, reason: "malformed" };
  }

  if (payload.exp <= Date.now()) {
    return { valid: false, reason: "expired" };
  }

  return {
    valid: true,
    expiresAt: new Date(payload.exp).toISOString(),
    expiresAtMs: payload.exp,
  };
}

module.exports = {
  DEFAULT_DURATION_HOURS,
  createSession,
  verifySession,
  verifyPassword,
  getExpectedPassword,
};
