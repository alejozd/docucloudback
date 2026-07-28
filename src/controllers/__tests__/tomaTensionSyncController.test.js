jest.mock("../../models", () => ({
  TomaTensionSync: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  Paciente: {
    findByPk: jest.fn(),
  },
}));

const { TomaTensionSync, Paciente } = require("../../models");
const {
  syncTomaTension,
  getTomaTensionSync,
} = require("../tomaTensionSyncController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("tomaTensionSyncController", () => {
  describe("syncTomaTension", () => {
    const bodyValido = {
      paciente_id: 2,
      sistole: 120,
      diastole: 80,
      ritmoCardiaco: 70,
      fecha_registro: "2026-07-28T09:18:00",
    };

    it("debe crear el registro cuando el paciente existe", async () => {
      Paciente.findByPk.mockResolvedValue({ id: 2, nombre: "Alejandro" });
      const registroCreado = { id: 1, ...bodyValido };
      TomaTensionSync.create.mockResolvedValue(registroCreado);

      const res = createMockRes();
      await syncTomaTension({ body: bodyValido }, res);

      expect(Paciente.findByPk).toHaveBeenCalledWith(2);
      expect(TomaTensionSync.create).toHaveBeenCalledWith(bodyValido);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(registroCreado);
    });

    it("debe retornar 400 si paciente_id no corresponde a ningún paciente", async () => {
      Paciente.findByPk.mockResolvedValue(null);

      const res = createMockRes();
      await syncTomaTension({ body: bodyValido }, res);

      expect(TomaTensionSync.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "paciente_id 2 no corresponde a ningún paciente registrado",
      });
    });

    it("debe retornar 400 si faltan campos obligatorios", async () => {
      const res = createMockRes();
      await syncTomaTension({ body: { sistole: 120 } }, res);

      expect(Paciente.findByPk).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getTomaTensionSync", () => {
    it("debe filtrar por paciente_id cuando se provee", async () => {
      TomaTensionSync.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const res = createMockRes();
      await getTomaTensionSync({ query: { paciente_id: "2" } }, res);

      expect(TomaTensionSync.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ paciente_id: 2 }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("debe retornar 400 si paciente_id no es un número", async () => {
      const res = createMockRes();
      await getTomaTensionSync({ query: { paciente_id: "abc" } }, res);

      expect(TomaTensionSync.findAndCountAll).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("sin paciente_id, no agrega ese filtro al where", async () => {
      TomaTensionSync.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      const res = createMockRes();
      await getTomaTensionSync({ query: {} }, res);

      const llamada = TomaTensionSync.findAndCountAll.mock.calls[0][0];
      expect(llamada.where.paciente_id).toBeUndefined();
    });
  });
});
