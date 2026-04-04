const crypto = require("crypto");
const { Licencia } = require("../models");

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

// Validar firma HMAC SHA256
const SECRET = process.env.LICENSE_SECRET;

function validarFirma(payloadBase64, firma) {
  const payload = Buffer.from(payloadBase64, "base64").toString("utf8");

  const firmaCalculada = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex");

  return firmaCalculada === firma;
}

function decodificarPayload(payloadBase64) {
  const json = Buffer.from(payloadBase64, "base64").toString("utf8");
  return JSON.parse(json);
}

// Activar licencia (solo si ya existe registrada)
const activarLicencia = async (nit, instalacion_hash, app) => {
  try {
    // Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit } });

    // ❌ NUEVO COMPORTAMIENTO: Si no existe → error "no_autorizado"
    if (!licencia) {
      throw new Error("no_autorizado");
    }

    // 🔹 Manejo de instalación
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash y fechas
      licencia.instalacion_hash = instalacion_hash;
      licencia.fecha_activacion = new Date();
      licencia.fecha_expiracion = new Date(
        Date.now() + licencia.dias_demo * 24 * 60 * 60 * 1000
      );
      await licencia.save();
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      // Hash diferente → rechazar
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    // 🔹 Validar expiración
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

    // 🔹 Manejo de instalación
    if (!licencia.instalacion_hash) {
      // Primera validación: asignar hash y guardar
      licencia.instalacion_hash = instalacion_hash;
      await licencia.save();
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      // Hash diferente → rechazar
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

// Crear licencia (solo admin) - SIN instalacion_hash aún
const crearLicencia = async (nit, app, dias_demo = 15) => {
  try {
    // Validar si ya existe → error "ya_existe"
    const licenciaExistente = await Licencia.findOne({ where: { nit } });

    if (licenciaExistente) {
      throw new Error("ya_existe");
    }

    // Crear registro con valores por defecto para licencia demo
    await Licencia.create({
      nit,
      app,
      estado: 'demo',
      tipo_licencia: 'demo',
      dias_demo,
      dias_licencia: null,
      instalacion_hash: null,
      fecha_activacion: null,
      fecha_expiracion: null,
      ultima_validacion: null
    });

    return {
      message: "Licencia creada correctamente",
    };
  } catch (error) {
    console.error("Error en crearLicencia:", error.message);
    throw error;
  }
};

// Registrar licencia con código firmado HMAC SHA256
const registrarLicencia = async (nit, instalacion_hash, codigo) => {
  try {
    // Separar payload y firma
    const partes = codigo.split(".");
    if (partes.length !== 2) {
      return { error: "licencia_invalida", mensaje: "Formato de licencia inválido" };
    }

    const [payloadBase64, firma] = partes;

    // Validar firma
    if (!validarFirma(payloadBase64, firma)) {
      return { error: "licencia_invalida", mensaje: "Firma inválida" };
    }

    // Decodificar payload
    const data = decodificarPayload(payloadBase64);

    if (data.nit !== nit) {
      return { error: "licencia_invalida", mensaje: "El NIT no coincide con la licencia" };
    }

    // Buscar licencia existente
    const licencia = await Licencia.findOne({ where: { nit } });

    if (!licencia) {
      return { error: "no_existe", mensaje: "No existe licencia para este NIT" };
    }

    // Validar hash
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash
      licencia.instalacion_hash = instalacion_hash;
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      return { error: "instalacion_invalida", mensaje: "El hash no coincide" };
    }

    // Actualizar licencia
    licencia.estado = "activa";
    // Solo actualizar fecha_expiracion si viene en el payload y no es null
    // Esto permite que activarOnline controle el cálculo de fecha_expiracion
    if (data.exp) {
      licencia.fecha_expiracion = new Date(data.exp);
    }
    licencia.updated_at = new Date();

    await licencia.save();

    return {
      estado: "activa",
      expira: licencia.fecha_expiracion,
      mensaje: "Licencia activada correctamente",
    };
  } catch (error) {
    console.error("Error en registrarLicencia:", error.message);
    return { error: "error_servidor", mensaje: error.message };
  }
};

// Generar código de licencia firmado con HMAC SHA256
const generarCodigoLicencia = async (nit, app, instalacion_hash, dias) => {
  try {
    const SECRET = process.env.LICENSE_SECRET;

    // Validar que instalacion_hash no venga vacío
    if (!instalacion_hash || instalacion_hash.trim() === "") {
      throw new Error("instalacion_hash_requerido");
    }

    // Si dias es null (licencia permanente), no establecer fecha de expiración
    let fechaExp = null;
    if (dias !== null && dias !== undefined) {
      fechaExp = new Date();
      fechaExp.setDate(fechaExp.getDate() + dias);
    }

    const payload = {
      nit,
      app,
      instalacion_hash,
      exp: fechaExp ? fechaExp.toISOString() : null,
    };

    const payloadString = JSON.stringify(payload);

    const payloadBase64 = Buffer.from(payloadString).toString("base64");

    const firma = crypto
      .createHmac("sha256", SECRET)
      .update(payloadString)
      .digest("hex");

    const codigo = `${payloadBase64}.${firma}`;

    return {
      codigo,
      payload,
    };
  } catch (error) {
    console.error("Error generando licencia:", error.message);
    throw error;
  }
};

// Activar licencia online - registro automático sin exponer el código
const activarOnline = async (nit, app, instalacion_hash) => {
  try {
    // 1. Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit } });

    // Si no existe → error "no_autorizado"
    if (!licencia) {
      throw new Error("no_autorizado");
    }

    // 2. Validar o asignar instalacion_hash
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash
      licencia.instalacion_hash = instalacion_hash;
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      // Hash diferente → error
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    // 3. Determinar los días y fecha_expiracion según el tipo de licencia
    const tipoLicencia = licencia.tipo_licencia || 'demo';
    let dias;
    let esPermanente = false;

    if (tipoLicencia === 'demo') {
      dias = licencia.dias_demo || 15;
    } else if (tipoLicencia === 'anual') {
      dias = licencia.dias_licencia || 365;
    } else if (tipoLicencia === 'permanente') {
      esPermanente = true;
      dias = null;
    }

    // 4. SIEMPRE actualizar fecha_activacion y recalcular fecha_expiracion según tipo_licencia
    licencia.fecha_activacion = new Date();
    licencia.estado = 'activa';

    if (esPermanente) {
      // permanente → fecha_expiracion = null
      licencia.fecha_expiracion = null;
    } else {
      // demo o anual → calcular desde hoy + dias correspondientes
      licencia.fecha_expiracion = new Date();
      licencia.fecha_expiracion.setDate(licencia.fecha_expiracion.getDate() + dias);
    }

    await licencia.save();

    // 5. Generar código de licencia internamente
    const { codigo } = await generarCodigoLicencia(
      nit,
      app || licencia.app,
      instalacion_hash,
      dias
    );

    // 6. Registrar la licencia usando el código generado (sin exponerlo)
    const resultado = await registrarLicencia(nit, instalacion_hash, codigo);

    if (resultado.error) {
      return resultado;
    }

    // 7. Retornar solo estado, expira y dias_restantes (sin exponer el código)
    // Si es permanente, no hay fecha de expiración y dias_restantes es null
    return {
      estado: resultado.estado,
      expira: esPermanente ? null : licencia.fecha_expiracion,
      dias_restantes: esPermanente ? null : calcularDiasRestantes(licencia.fecha_expiracion),
    };
  } catch (error) {
    console.error("Error en activarOnline:", error.message);
    throw error;
  }
};

// Convertir licencia demo a real (anual o permanente)
const convertirLicencia = async (nit, tipo_licencia, dias_licencia) => {
  try {
    // Buscar licencia por NIT
    const licencia = await Licencia.findOne({ where: { nit } });

    if (!licencia) {
      throw new Error("no_existe");
    }

    // Validar tipo de licencia
    if (!['anual', 'permanente'].includes(tipo_licencia)) {
      throw new Error("tipo_invalido");
    }

    // Si es anual, validar que dias_licencia sea un número positivo
    if (tipo_licencia === 'anual' && (!dias_licencia || typeof dias_licencia !== 'number' || dias_licencia <= 0)) {
      throw new Error("dias_requeridos");
    }

    // Actualizar tipo de licencia
    licencia.tipo_licencia = tipo_licencia;

    // Asignar dias_licencia según el tipo
    if (tipo_licencia === 'anual') {
      licencia.dias_licencia = dias_licencia;
    } else {
      // Permanente → dias_licencia = null
      licencia.dias_licencia = null;
    }

    // Resetear fecha_expiracion a null (se regenerará en próxima activación)
    licencia.fecha_expiracion = null;

    await licencia.save();

    return {
      message: "Licencia actualizada correctamente",
    };
  } catch (error) {
    console.error("Error en convertirLicencia:", error.message);
    throw error;
  }
};

module.exports = {
  activarLicencia,
  validarLicencia,
  generarLicenciaOffline,
  crearLicencia,
  registrarLicencia,
  generarCodigoLicencia,
  calcularDiasRestantes,
  generarHash,
  validarFirma,
  decodificarPayload,
  activarOnline,
  convertirLicencia,
};
