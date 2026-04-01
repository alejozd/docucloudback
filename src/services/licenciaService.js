const crypto = require("crypto");
const Licencia = require("../models/Licencia");

// Helpers
const calcularDiasRestantes = (fechaExpiracion) => {
  if (!fechaExpiracion) return 0;
  const ahora = new Date();
  const expiracion = new Date(fechaExpiracion);
  const diferenciaMs = expiracion - ahora;
  return Math.max(0, Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)));
};

const generarHash = (data) => {
  return crypto.createHash("sha256").update(data).digest("hex");
};

// Activar licencia (primera vez → demo)
const activarLicencia = async (nit, instalacion_hash, app) => {
  try {
    // Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit } });

    if (!licencia) {
      // NO existe: crear con estado = 'demo'
      const fechaActivacion = new Date();
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaActivacion.getDate() + 15); // 15 días demo

      licencia = await Licencia.create({
        nit,
        instalacion_hash,
        estado: "demo",
        fecha_activacion: fechaActivacion,
        fecha_expiracion: fechaExpiracion,
        dias_demo: 15,
        app,
      });

      return {
        estado: licencia.estado,
        expira: licencia.fecha_expiracion,
        dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
      };
    }

    // Existe: validar si expiró → cambiar a 'bloqueado'
    const ahora = new Date();
    if (licencia.fecha_expiracion && new Date(licencia.fecha_expiracion) < ahora) {
      licencia.estado = "bloqueado";
      await licencia.save();
      return {
        estado: "bloqueado",
        expira: licencia.fecha_expiracion,
        dias_restantes: 0,
        mensaje: "licencia_expirada",
      };
    }

    // Validar si instalacion_hash es diferente → rechazar
    if (licencia.instalacion_hash !== instalacion_hash) {
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    return {
      estado: licencia.estado,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
    };
  } catch (error) {
    console.error("Error en activarLicencia:", error.message);
    throw error;
  }
};

// Validar licencia (uso normal)
const validarLicencia = async (nit, instalacion_hash) => {
  try {
    // Buscar licencia
    const licencia = await Licencia.findOne({ where: { nit } });

    // Si no existe → error "no_autorizado"
    if (!licencia) {
      return {
        error: "no_autorizado",
        mensaje: "No existe licencia registrada para este NIT",
      };
    }

    // Si instalacion_hash no coincide → error
    if (licencia.instalacion_hash !== instalacion_hash) {
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    // Si expiró → estado = bloqueado
    const ahora = new Date();
    if (licencia.fecha_expiracion && new Date(licencia.fecha_expiracion) < ahora) {
      licencia.estado = "bloqueado";
      await licencia.save();
      return {
        estado: "bloqueado",
        expira: licencia.fecha_expiracion,
        dias_restantes: 0,
        mensaje: "licencia_expirada",
      };
    }

    // Actualizar ultima_validacion = now
    licencia.ultima_validacion = ahora;
    await licencia.save();

    return {
      estado: licencia.estado,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
    };
  } catch (error) {
    console.error("Error en validarLicencia:", error.message);
    throw error;
  }
};

// Generar licencia offline firmada
const generarLicenciaOffline = async (nit, instalacion_hash, dias) => {
  try {
    const SECRET_KEY = process.env.LICENCIA_SECRET_KEY || "default-secret-key";

    // Construir objeto
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + dias);

    const licenciaObj = {
      nit,
      instalacion: instalacion_hash,
      expira: fechaExpiracion.toISOString(),
      tipo: "offline",
    };

    // Generar firma con SHA256(nit + instalacion + expira + SECRET_KEY)
    const stringFirma = `${nit}${instalacion_hash}${licenciaObj.expira}${SECRET_KEY}`;
    const firma = generarHash(stringFirma);

    return {
      licencia: licenciaObj,
      firma,
    };
  } catch (error) {
    console.error("Error en generarLicenciaOffline:", error.message);
    throw error;
  }
};

module.exports = {
  activarLicencia,
  validarLicencia,
  generarLicenciaOffline,
  calcularDiasRestantes,
  generarHash,
};
