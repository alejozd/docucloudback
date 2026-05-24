const crypto = require("crypto");

// Mock del modelo Licencia desde models/index
const mockLicenciaModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

// Mock de sequelize - mockear el index completo
jest.mock("../../models", () => ({
  Licencia: mockLicenciaModel,
}));

// Variables de entorno para tests
process.env.LICENCIA_SECRET_KEY = "test-secret-key";

const licenciaService = require("../../services/licenciaService");

describe("Licencia Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("activarLicencia", () => {
    it("debe retornar no_autorizado si no existe licencia", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const app = "mi-app";

      mockLicenciaModel.findOne.mockResolvedValue(null);

      await expect(
        licenciaService.activarLicencia(nit, instalacion_hash, app)
      ).rejects.toThrow("no_autorizado");
    });

    it("debe activar licencia cuando no tiene instalacion_hash", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const app = "mi-app";

      const licenciaSinActivar = {
        id: 1,
        nit,
        instalacion_hash: null,
        estado: "demo",
        dias_demo: 15,
        fecha_activacion: null,
        fecha_expiracion: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaSinActivar);

      const resultado = await licenciaService.activarLicencia(
        nit,
        instalacion_hash,
        app
      );

      expect(resultado.estado).toBe("demo");
      expect(resultado.dias_restantes).toBeGreaterThanOrEqual(14);
      expect(licenciaSinActivar.instalacion_hash).toBe(instalacion_hash);
      expect(licenciaSinActivar.save).toHaveBeenCalled();
    });

    it("debe usar dias_licencia si es anual durante la primera activación", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const app = "mi-app";

      const licenciaAnualSinActivar = {
        id: 1,
        nit,
        instalacion_hash: null,
        estado: "demo",
        tipo_licencia: "anual",
        dias_licencia: 365,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaAnualSinActivar);

      const resultado = await licenciaService.activarLicencia(
        nit,
        instalacion_hash,
        app
      );

      expect(resultado.tipo_licencia).toBe("anual");
      expect(resultado.dias_restantes).toBeGreaterThan(360);
      expect(licenciaAnualSinActivar.save).toHaveBeenCalled();
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
    it("debe crear automáticamente una licencia DEMO si no existe", async () => {
      const nit = "999999999";
      const instalacion_hash = "hash-instalacion-1";
      const app = "mi-app";

      const fechaExpiracionEsperada = new Date();
      fechaExpiracionEsperada.setDate(fechaExpiracionEsperada.getDate() + 15);

      mockLicenciaModel.findOne.mockResolvedValue(null);
      
      const nuevaLicencia = {
        id: 1,
        nit,
        app,
        estado: "demo",
        tipo_licencia: "demo",
        dias_demo: 15,
        instalacion_hash,
        fecha_activacion: new Date(),
        fecha_expiracion: fechaExpiracionEsperada,
        ultima_validacion: new Date(),
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockLicenciaModel.create.mockResolvedValue(nuevaLicencia);

      const resultado = await licenciaService.validarLicencia(
        nit,
        instalacion_hash,
        app
      );

      expect(mockLicenciaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nit,
          app,
          estado: 'demo',
          tipo_licencia: 'demo',
          dias_demo: 15,
          instalacion_hash,
        })
      );
      expect(resultado.estado).toBe("demo");
      expect(resultado.tipo_licencia).toBe("demo");
    });

    it("debe validar correctamente una licencia activa", async () => {
      const nit = "123456789";
      const instalacion_hash = "hash-instalacion-1";
      const fechaExpiracion = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const licenciaActiva = {
        id: 1,
        nit,
        instalacion_hash,
        estado: "activa",
        fecha_expiracion: fechaExpiracion,
        ultima_validacion: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(licenciaActiva);

      const resultado = await licenciaService.validarLicencia(
        nit,
        instalacion_hash,
        "mi-app"
      );

      expect(resultado.estado).toBe("activa");
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
        instalacion_hash,
        "mi-app"
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

  describe("registrarLicencia", () => {
    const nit = "123456789";
    const app = "mi-app";
    const instalacion_hash = "hash-123";
    const SECRET = "test-secret";
    process.env.LICENSE_SECRET = SECRET;

    it("debe registrar correctamente una licencia válida", async () => {
      const payload = { nit, app, instalacion_hash, exp: new Date(Date.now() + 86400000).toISOString() };
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString("base64");
      const firma = crypto.createHmac("sha256", SECRET).update(payloadString).digest("hex");
      const codigo = `${payloadBase64}.${firma}`;

      const mockLicencia = {
        nit,
        app,
        instalacion_hash: null,
        estado: "demo",
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      const resultado = await licenciaService.registrarLicencia(nit, instalacion_hash, codigo);

      expect(resultado.estado).toBe("activa");
      expect(mockLicencia.instalacion_hash).toBe(instalacion_hash);
      expect(mockLicencia.save).toHaveBeenCalled();
    });

    it("debe retornar error si el NIT no coincide", async () => {
      const payload = { nit: "otro-nit", app, instalacion_hash };
      const payloadString = JSON.stringify(payload);
      const payloadBase64 = Buffer.from(payloadString).toString("base64");
      const firma = crypto.createHmac("sha256", SECRET).update(payloadString).digest("hex");
      const codigo = `${payloadBase64}.${firma}`;

      const resultado = await licenciaService.registrarLicencia(nit, instalacion_hash, codigo);

      expect(resultado.error).toBe("licencia_invalida");
      expect(resultado.mensaje).toContain("NIT no coincide");
    });
  });

  describe("crearLicencia", () => {
    it("debe crear una nueva licencia sin instalacion_hash", async () => {
      const nit = "123456789";
      const app = "mi-app";
      const dias_demo = 15;

      mockLicenciaModel.findOne.mockResolvedValue(null);
      mockLicenciaModel.create.mockResolvedValue({
        id: 1,
        nit,
        app,
        estado: "demo",
        dias_demo,
        instalacion_hash: null,
      });

      const resultado = await licenciaService.crearLicencia(nit, app, dias_demo);

      expect(resultado.message).toBe("Licencia creada correctamente");
      expect(mockLicenciaModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nit,
          app,
          estado: "demo",
          dias_demo,
        })
      );
    });

    it("debe lanzar error ya_existe si el NIT ya está registrado", async () => {
      const nit = "123456789";
      const app = "mi-app";

      mockLicenciaModel.findOne.mockResolvedValue({
        id: 1,
        nit,
        app,
      });

      await expect(
        licenciaService.crearLicencia(nit, app, 15)
      ).rejects.toThrow("ya_existe");
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

  describe("convertirLicencia", () => {
    const nit = "123456789";
    const app = "mi-app";

    it("debe crear una nueva licencia si no existe", async () => {
      mockLicenciaModel.findOne.mockResolvedValue(null);
      mockLicenciaModel.create.mockResolvedValue({
        nit,
        app,
        estado: "demo",
        tipo_licencia: "anual",
        dias_licencia: 365,
      });

      const resultado = await licenciaService.convertirLicencia(nit, app, "anual", 365, "hash-123");

      expect(mockLicenciaModel.create).toHaveBeenCalledWith(expect.objectContaining({
        nit,
        app,
        tipo_licencia: "anual",
        dias_licencia: 365,
        instalacion_hash: "hash-123"
      }));
      expect(resultado.ok).toBe(true);
      expect(resultado.mensaje).toContain("creada");
    });

    it("debe actualizar una licencia existente", async () => {
      const mockLicencia = {
        nit,
        app,
        tipo_licencia: "demo",
        estado: "demo",
        instalacion_hash: "hash-123",
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      const resultado = await licenciaService.convertirLicencia(nit, app, "anual", 365);

      expect(mockLicencia.tipo_licencia).toBe("anual");
      expect(mockLicencia.dias_licencia).toBe(365);
      expect(mockLicencia.save).toHaveBeenCalled();
      expect(resultado.ok).toBe(true);
      expect(resultado.mensaje).toContain("actualizada");
    });

    it("debe asignar instalacion_hash si la existente es nula", async () => {
      const mockLicencia = {
        nit,
        app,
        tipo_licencia: "demo",
        instalacion_hash: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      await licenciaService.convertirLicencia(nit, app, "permanente", null, "nuevo-hash");

      expect(mockLicencia.instalacion_hash).toBe("nuevo-hash");
      expect(mockLicencia.save).toHaveBeenCalled();
    });

    it("debe fallar si el tipo de licencia es inválido", async () => {
      await expect(
        licenciaService.convertirLicencia(nit, app, "invalido", 365)
      ).rejects.toThrow("tipo_invalido");
    });

    it("debe fallar si falta dias_licencia para tipo anual", async () => {
      await expect(
        licenciaService.convertirLicencia(nit, app, "anual", null)
      ).rejects.toThrow("dias_requeridos");
    });

    it("debe retornar error si el hash no coincide", async () => {
      mockLicenciaModel.findOne.mockResolvedValue({
        nit,
        app,
        instalacion_hash: "hash-original",
      });

      const resultado = await licenciaService.convertirLicencia(nit, app, "anual", 365, "hash-diferente");

      expect(resultado.error).toBe("instalacion_invalida");
    });
  });

  describe("activarOnline - Flujo completo", () => {
    const nit = "123456789";
    const app = "mi-app";
    const instalacion_hash = "hash-123";

    it("debe activar una licencia que acaba de ser convertida a anual", async () => {
      // 1. Simular licencia convertida (estado demo, tipo anual)
      const mockLicencia = {
        nit,
        app,
        instalacion_hash,
        estado: "demo",
        tipo_licencia: "anual",
        dias_licencia: 365,
        fecha_expiracion: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      // 2. Llamar a activarOnline (el frontend podría enviar tipo_licencia: 'demo' por error)
      const resultado = await licenciaService.activarOnline(
        nit,
        app,
        instalacion_hash,
        "demo", // Intento de downgrade accidental
        15,
        null
      );

      // 3. Verificar que se mantuvo como ANUAL y se calcularon 365 días
      expect(resultado.tipo_licencia).toBe("anual");
      expect(resultado.estado).toBe("activa");
      expect(resultado.dias_restantes).toBeGreaterThan(360);
      expect(mockLicencia.tipo_licencia).toBe("anual");
      expect(mockLicencia.save).toHaveBeenCalled();
    });

    it("no debe recalcular la fecha de expiración si ya está activa y es del mismo tipo", async () => {
      const fechaExpOriginal = new Date();
      fechaExpOriginal.setDate(fechaExpOriginal.getDate() + 100);

      const mockLicencia = {
        nit,
        app,
        instalacion_hash,
        estado: "activa",
        tipo_licencia: "anual",
        dias_licencia: 365,
        fecha_expiracion: fechaExpOriginal,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      const resultado = await licenciaService.activarOnline(
        nit,
        app,
        instalacion_hash,
        "anual"
      );

      // La fecha de expiración debería ser la misma
      expect(new Date(resultado.expira).getTime()).toBe(fechaExpOriginal.getTime());
    });

    it("debe recalcular la fecha si la licencia ya expiró", async () => {
      const fechaExpPasada = new Date();
      fechaExpPasada.setDate(fechaExpPasada.getDate() - 5);

      const mockLicencia = {
        nit,
        app,
        instalacion_hash,
        estado: "activa", // o bloqueado
        tipo_licencia: "anual",
        dias_licencia: 365,
        fecha_expiracion: fechaExpPasada,
        save: jest.fn().mockResolvedValue(true),
      };

      mockLicenciaModel.findOne.mockResolvedValue(mockLicencia);

      const resultado = await licenciaService.activarOnline(
        nit,
        app,
        instalacion_hash,
        "anual"
      );

      // La fecha de expiración debería ser nueva (aprox 365 días desde ahora)
      expect(new Date(resultado.expira).getTime()).toBeGreaterThan(Date.now());
      expect(resultado.dias_restantes).toBeGreaterThan(360);
    });
  });
});
