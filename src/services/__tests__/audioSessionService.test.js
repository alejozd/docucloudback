const audioSessionService = require("../audioSessionService");

const ORIGINAL_ENV = {
  AUDIO_SESSION_SECRET: process.env.AUDIO_SESSION_SECRET,
  AUDIO_ACCESS_PASSWORD: process.env.AUDIO_ACCESS_PASSWORD,
  ZAM_API_KEY: process.env.ZAM_API_KEY,
};

const restoreEnv = () => {
  Object.entries(ORIGINAL_ENV).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
};

beforeEach(() => {
  process.env.AUDIO_SESSION_SECRET = "secreto-de-firma-para-tests";
  process.env.AUDIO_ACCESS_PASSWORD = "clave-de-acceso";
  delete process.env.ZAM_API_KEY;
});

afterEach(() => {
  restoreEnv();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("audioSessionService.verifyPassword", () => {
  it("acepta la clave correcta", () => {
    expect(audioSessionService.verifyPassword("clave-de-acceso")).toEqual({
      ok: true,
    });
  });

  it("rechaza una clave incorrecta", () => {
    expect(audioSessionService.verifyPassword("otra-clave")).toEqual({
      ok: false,
      reason: "mismatch",
    });
  });

  it("rechaza claves vacías o de tipo incorrecto", () => {
    expect(audioSessionService.verifyPassword("").reason).toBe("mismatch");
    expect(audioSessionService.verifyPassword(undefined).reason).toBe("mismatch");
    expect(audioSessionService.verifyPassword(123).reason).toBe("mismatch");
  });

  it("reporta que no está configurada si no hay clave en el entorno", () => {
    delete process.env.AUDIO_ACCESS_PASSWORD;
    delete process.env.ZAM_API_KEY;

    expect(audioSessionService.verifyPassword("cualquiera")).toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("usa ZAM_API_KEY como respaldo si no hay AUDIO_ACCESS_PASSWORD", () => {
    delete process.env.AUDIO_ACCESS_PASSWORD;
    process.env.ZAM_API_KEY = "api-key-general";

    expect(audioSessionService.verifyPassword("api-key-general")).toEqual({
      ok: true,
    });
  });
});

describe("audioSessionService.createSession", () => {
  it("crea un token válido que vence en 24 horas", () => {
    const before = Date.now();
    const session = audioSessionService.createSession();

    expect(typeof session.token).toBe("string");
    expect(session.token).toContain(".");

    const expectedExpiry = before + 24 * 60 * 60 * 1000;
    expect(session.expiresAtMs).toBeGreaterThanOrEqual(expectedExpiry);
    expect(session.expiresAtMs).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);

    const verification = audioSessionService.verifySession(session.token);
    expect(verification.valid).toBe(true);
    expect(verification.expiresAtMs).toBe(session.expiresAtMs);
  });

  it("respeta una duración personalizada", () => {
    const session = audioSessionService.createSession(1);
    const oneHour = 60 * 60 * 1000;

    expect(session.expiresAtMs - Date.now()).toBeLessThanOrEqual(oneHour + 1000);
    expect(session.expiresAtMs - Date.now()).toBeGreaterThan(oneHour - 5000);
  });

  it("lanza error si no hay secreto configurado", () => {
    delete process.env.AUDIO_SESSION_SECRET;
    delete process.env.ZAM_API_KEY;

    expect(() => audioSessionService.createSession()).toThrow(/secreto/i);
  });

  it("genera tokens distintos en llamadas sucesivas", () => {
    const first = audioSessionService.createSession();
    const second = audioSessionService.createSession();

    expect(first.token).not.toBe(second.token);
  });
});

describe("audioSessionService.verifySession", () => {
  it("rechaza un token vacío, nulo o malformado", () => {
    expect(audioSessionService.verifySession("").reason).toBe("malformed");
    expect(audioSessionService.verifySession(null).reason).toBe("malformed");
    expect(audioSessionService.verifySession("sin-punto").reason).toBe("malformed");
    expect(audioSessionService.verifySession("a.").reason).toBe("malformed");
    expect(audioSessionService.verifySession(".b").reason).toBe("malformed");
  });

  it("rechaza un token con firma manipulada", () => {
    const { token } = audioSessionService.createSession();
    const [payload] = token.split(".");

    expect(audioSessionService.verifySession(`${payload}.firmafalsa`).valid).toBe(
      false,
    );
  });

  it("rechaza un token firmado con otro secreto", () => {
    const { token } = audioSessionService.createSession();
    process.env.AUDIO_SESSION_SECRET = "otro-secreto-distinto";

    const result = audioSessionService.verifySession(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rechaza un token expirado", () => {
    const { token } = audioSessionService.createSession();
    const realNow = Date.now();

    jest.spyOn(Date, "now").mockReturnValue(realNow + 25 * 60 * 60 * 1000);

    const result = audioSessionService.verifySession(token);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("sigue siendo válido justo antes de las 24 horas", () => {
    const { token } = audioSessionService.createSession();
    const realNow = Date.now();

    jest.spyOn(Date, "now").mockReturnValue(realNow + 24 * 60 * 60 * 1000 - 1000);

    expect(audioSessionService.verifySession(token).valid).toBe(true);
  });
});
