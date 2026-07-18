const { authenticateApiKey } = require("../apiKeyMiddleware");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const ORIGINAL_KEY = process.env.TOMA_TENSION_API_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.TOMA_TENSION_API_KEY;
  } else {
    process.env.TOMA_TENSION_API_KEY = ORIGINAL_KEY;
  }
  jest.restoreAllMocks();
});

describe("authenticateApiKey", () => {
  it("permite la solicitud y advierte si no hay API key configurada", () => {
    delete process.env.TOMA_TENSION_API_KEY;
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const req = { headers: {} };
    const res = createMockRes();
    const next = jest.fn();

    authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it("rechaza la solicitud cuando falta la API key", () => {
    process.env.TOMA_TENSION_API_KEY = "secreto-valido";

    const req = { headers: {} };
    const res = createMockRes();
    const next = jest.fn();

    authenticateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "API key inválida o no proporcionada",
    });
  });

  it("rechaza la solicitud cuando la API key es incorrecta", () => {
    process.env.TOMA_TENSION_API_KEY = "secreto-valido";

    const req = { headers: { "x-api-key": "otra-cosa" } };
    const res = createMockRes();
    const next = jest.fn();

    authenticateApiKey(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("permite la solicitud cuando la API key es correcta", () => {
    process.env.TOMA_TENSION_API_KEY = "secreto-valido";

    const req = { headers: { "x-api-key": "secreto-valido" } };
    const res = createMockRes();
    const next = jest.fn();

    authenticateApiKey(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
