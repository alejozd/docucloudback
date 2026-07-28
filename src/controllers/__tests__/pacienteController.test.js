jest.mock("../../models", () => ({
  Paciente: {
    findAll: jest.fn(),
  },
}));

const { Paciente } = require("../../models");
const { getPacientes } = require("../pacienteController");

const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pacienteController", () => {
  describe("getPacientes", () => {
    it("debe retornar 200 con la lista de pacientes ordenada por id", async () => {
      const pacientes = [
        { id: 1, nombre: "José Luis" },
        { id: 2, nombre: "Alejandro" },
      ];
      Paciente.findAll.mockResolvedValue(pacientes);

      const res = createMockRes();
      await getPacientes({}, res);

      expect(Paciente.findAll).toHaveBeenCalledWith({ order: [["id", "ASC"]] });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(pacientes);
    });

    it("debe retornar 500 cuando la BD falla", async () => {
      Paciente.findAll.mockRejectedValue(new Error("Error de conexión"));

      const res = createMockRes();
      await getPacientes({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Error al obtener la lista de pacientes",
        error: "Error de conexión",
      });
    });
  });
});
