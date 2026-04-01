const crypto = require("crypto");

// Mock del modelo Licencia
const mockLicenciaModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

// Mock de sequelize
jest.mock("../../models/Licencia", () => mockLicenciaModel);

// Variables de entorno para tests
process.env.LICENCIA_SECRET_KEY = "test-secret-key";

const licenciaService = require("../../services/licenciaService");

describe("Licencia Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("activarLicencia", () => {
    it("debe crear una nueva licencia demo cuando no existe", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const app = "mi-app";

      mockLicenciaModel.findOne.mockResolvedValue(null);
      mockLicenciaModel.create.mockResolvedValue({
        id: 1,
        nit,
        instalacion_hash,
        estado: "demo",
        fecha_activacion: new Date(),
        fecha_expiracion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        dias_demo: 15,
        app,
      });

      const resultado = await licenciaService.activarLicencia(
        nit,
        instalacion_hash,
        app
      );

      expect(resultado.estado).toBe("demo");
      expect(resultado.dias_restantes).toBeGreaterThanOrEqual(14);
      expect(mockLicenciaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nit,
          instalacion_hash,
          estado: "demo",
          app,
        })
      );
    });

    it("debe rechazar si el hash de instalación no coincide", async () => {
      const nit = "123456789";
      const instalacion_hash_original = "hash-original";
      const instalacion_hash_nuevo = "hash-nuevo";

      mockLicenciaModel.findOne.mockResolvedValue({
        id: 1,
        nit,
        instalacion_hash: instalacion_hash_original,
        estado: "demo",
        fecha_expiracion: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      });

      const resultado = await licenciaService.activarLicencia(
        nit,
        instalacion_hash_nuevo,
        "mi-app"
      );

      expect(resultado.error).toBe("instalacion_invalida");
    });

    it("debe bloquear licencia expirada", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";

      const licenciaExpirada = {
        id: 1,
        nit,
        instalacion_hash,
        estado: "demo",
        fecha_expiracion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 día atrás
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaExpirada);

      const resultado = await licenciaService.activarLicencia(
        nit,
        instalacion_hash,
        "mi-app"
      );

      expect(resultado.estado).toBe("bloqueado");
      expect(resultado.mensaje).toBe("licencia_expirada");
      expect(licenciaExpirada.save).toHaveBeenCalled();
    });
  });

  describe("validarLicencia", () => {
    it("debe retornar error no_autorizado si no existe licencia", async () => {
      const nit = "999999999";
      const instalacion_hash = "hash-instalacion-1";

      mockLicenciaModel.findOne.mockResolvedValue(null);

      const resultado = await licenciaService.validarLicencia(
        nit,
        instalacion_hash
      );

      expect(resultado.error).toBe("no_autorizado");
    });

    it("debe validar correctamente una licencia activa", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const fechaExpiracion = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const licenciaActiva = {
        id: 1,
        nit,
        instalacion_hash,
        estado: "activo",
        fecha_expiracion: fechaExpiracion,
        ultima_validacion: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaActiva);

      const resultado = await licenciaService.validarLicencia(
        nit,
        instalacion_hash
      );

      expect(resultado.estado).toBe("activo");
      expect(resultado.dias_restantes).toBeGreaterThanOrEqual(14);
      expect(licenciaActiva.ultima_validacion).toBeDefined();
      expect(licenciaActiva.save).toHaveBeenCalled();
    });

    it("debe bloquear y retornar error si la licencia expiró", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";

      const licenciaExpirada = {
        id: 1,
        nit,
        instalacion_hash,
        estado: "demo",
        fecha_expiracion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaExpirada);

      const resultado = await licenciaService.validarLicencia(
        nit,
        instalacion_hash
      );

      expect(resultado.estado).toBe("bloqueado");
      expect(resultado.mensaje).toBe("licencia_expirada");
    });
  });

  describe("generarLicenciaOffline", () => {
    it("debe generar licencia offline con firma válida", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const dias = 30;

      const resultado = await licenciaService.generarLicenciaOffline(
        nit,
        instalacion_hash,
        dias
      );

      expect(resultado.licencia).toBeDefined();
      expect(resultado.licencia.nit).toBe(nit);
      expect(resultado.licencia.instalacion).toBe(instalacion_hash);
      expect(resultado.licencia.tipo).toBe("offline");
      expect(resultado.firma).toBeDefined();
      expect(resultado.firma.length).toBe(64); // SHA256 produce 64 caracteres hex

      // Verificar que la firma es correcta
      const SECRET_KEY = process.env.LICENCIA_SECRET_KEY;
      const stringFirma = `${nit}${instalacion_hash}${resultado.licencia.expira}${SECRET_KEY}`;
      const firmaEsperada = crypto
        .createHash("sha256")
        .update(stringFirma)
        .digest("hex");

      expect(resultado.firma).toBe(firmaEsperada);
    });

    it("debe calcular correctamente la fecha de expiración", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const dias = 60;

      const resultado = await licenciaService.generarLicenciaOffline(
        nit,
        instalacion_hash,
        dias
      );

      const fechaExpiracion = new Date(resultado.licencia.expira);
      const fechaEsperada = new Date();
      fechaEsperada.setDate(fechaEsperada.getDate() + dias);

      // Comparar con margen de误差 (por el tiempo de ejecución)
      const diferenciaMs = Math.abs(fechaExpiracion - fechaEsperada);
      expect(diferenciaMs).toBeLessThan(1000); // menos de 1 segundo
    });
  });

  describe("calcularDiasRestantes", () => {
    it("debe calcular días restantes correctamente", () => {
      const fechaExpiracion = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 días
      const dias = licenciaService.calcularDiasRestantes(fechaExpiracion);
      expect(dias).toBe(10);
    });

    it("debe retornar 0 si ya expiró", () => {
      const fechaExpiracion = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 días atrás
      const dias = licenciaService.calcularDiasRestantes(fechaExpiracion);
      expect(dias).toBe(0);
    });

    it("debe retornar 0 si fecha es nula", () => {
      const dias = licenciaService.calcularDiasRestantes(null);
      expect(dias).toBe(0);
    });
  });
});
