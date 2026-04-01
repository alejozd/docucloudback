const { calcularDiasRestantes, generarFirmaOffline } = require('../../helpers/licenciaHelper');

describe('licenciaHelper', () => {
  describe('calcularDiasRestantes', () => {
    test('debe calcular correctamente los días restantes en el futuro', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 10); // 10 días en el futuro
      
      const diasRestantes = calcularDiasRestantes(fechaFutura);
      
      expect(diasRestantes).toBe(10);
    });

    test('debe retornar negativo cuando la fecha ya expiró', () => {
      const fechaPasada = new Date();
      fechaPasada.setDate(fechaPasada.getDate() - 5); // 5 días en el pasado
      
      const diasRestantes = calcularDiasRestantes(fechaPasada);
      
      expect(diasRestantes).toBeLessThan(0);
    });

    test('debe retornar 0 para hoy', () => {
      const hoy = new Date();
      const diasRestantes = calcularDiasRestantes(hoy);
      
      expect(diasRestantes).toBeGreaterThanOrEqual(0);
      expect(diasRestantes).toBeLessThanOrEqual(1);
    });
  });

  describe('generarFirmaOffline', () => {
    test('debe generar una firma SHA256 válida', () => {
      const nit = '900123456';
      const instalacion = 'hash_instalacion_123';
      const expira = '2025-12-31T23:59:59.000Z';
      const secretKey = 'mi_clave_secreta';

      const firma = generarFirmaOffline(nit, instalacion, expira, secretKey);

      // La firma debe ser un hash SHA256 (64 caracteres hexadecimales)
      expect(firma).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(firma)).toBe(true);
    });

    test('debe generar firmas diferentes con diferentes inputs', () => {
      const secretKey = 'mi_clave_secreta';
      
      const firma1 = generarFirmaOffline('nit1', 'instalacion1', '2025-12-31', secretKey);
      const firma2 = generarFirmaOffline('nit2', 'instalacion1', '2025-12-31', secretKey);
      const firma3 = generarFirmaOffline('nit1', 'instalacion2', '2025-12-31', secretKey);

      expect(firma1).not.toBe(firma2);
      expect(firma1).not.toBe(firma3);
      expect(firma2).not.toBe(firma3);
    });

    test('debe generar la misma firma con los mismos inputs', () => {
      const nit = '900123456';
      const instalacion = 'hash_unico';
      const expira = '2025-12-31T23:59:59.000Z';
      const secretKey = 'mi_clave_secreta';

      const firma1 = generarFirmaOffline(nit, instalacion, expira, secretKey);
      const firma2 = generarFirmaOffline(nit, instalacion, expira, secretKey);

      expect(firma1).toBe(firma2);
    });
  });
});
