const crypto = require("crypto");
const { Licencia } = require("../models");

// Constantes de estados para evitar errores
const ESTADOS = {
  DEMO: 'demo',
  ACTIVA: 'activa',
  BLOQUEADO: 'bloqueado'
};

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
function getSecret() {
  return process.env.LICENSE_SECRET || "default-secret";
}

function validarFirma(payloadBase64, firma) {
  const payload = Buffer.from(payloadBase64, "base64").toString("utf8");

  const firmaCalculada = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  return firmaCalculada === firma;
}

function decodificarPayload(payloadBase64) {
  const json = Buffer.from(payloadBase64, "base64").toString("utf8");
  return JSON.parse(json);
}

const validarApp = (app) => {
  if (!app || typeof app !== "string" || app.trim() === "") {
    throw new Error("app_requerida");
  }
};

const normalizarInput = (val) => {
  return typeof val === 'string' ? val.trim() : val;
};

// Activar licencia (solo si ya existe registrada)
const activarLicencia = async (nit, instalacion_hash, app, ultima_ip, version_app) => {
  try {
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit, app } });

    // ❌ NUEVO COMPORTAMIENTO: Si no existe → error "no_autorizado"
    if (!licencia) {
      throw new Error("no_autorizado");
    }

    // 🔹 Manejo de instalación
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash y fechas
      licencia.instalacion_hash = instalacion_hash;
      licencia.fecha_activacion = new Date();

      // Determinar días según tipo de licencia
      let diasParaAgregar = licencia.dias_demo || 15;
      if (licencia.tipo_licencia === 'anual') {
        diasParaAgregar = licencia.dias_licencia || 365;
      } else if (licencia.tipo_licencia === 'permanente') {
        diasParaAgregar = null;
      }

      if (diasParaAgregar !== null) {
        licencia.fecha_expiracion = new Date(
          Date.now() + diasParaAgregar * 24 * 60 * 60 * 1000
        );
      } else {
        licencia.fecha_expiracion = null;
      }

      licencia.ultima_validacion = new Date();
      licencia.ultima_ip = ultima_ip || licencia.ultima_ip;
      if (version_app) licencia.version_app = version_app;
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
      licencia.estado = ESTADOS.BLOQUEADO;
      await licencia.save();
      return {
        estado: ESTADOS.BLOQUEADO,
        tipo_licencia: licencia.tipo_licencia,
        expira: licencia.fecha_expiracion,
        dias_restantes: 0,
        instalacion_hash: licencia.instalacion_hash,
        app: licencia.app,
        version_app: version_app || licencia.version_app || null,
        mensaje: "licencia_expirada",
      };
    }

    return {
      estado: licencia.estado,
      tipo_licencia: licencia.tipo_licencia,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
      instalacion_hash: licencia.instalacion_hash,
      app: licencia.app,
      version_app: version_app || licencia.version_app || null,
    };
  } catch (error) {
    console.error("Error en activarLicencia:", error.message);
    throw error;
  }
};

// Validar licencia (uso normal) - con auto-creación de licencias demo
const validarLicencia = async (nit, instalacion_hash, app, ultima_ip, version_app) => {
  try {
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // Buscar licencia
    let licencia = await Licencia.findOne({ where: { nit, app } });

    // Si no existe → crear automáticamente una licencia DEMO
    if (!licencia) {
      console.log(`[validarLicencia] Licencia no encontrada para NIT: ${nit}, APP: ${app}, creando DEMO automáticamente`);
      
      const diasDemo = process.env.DIAS_DEMO ? parseInt(process.env.DIAS_DEMO) : 15;
      const ahora = new Date();
      const fechaExpiracion = new Date(ahora.getTime() + diasDemo * 24 * 60 * 60 * 1000);
      
      licencia = await Licencia.create({
        nit,
        app,
        estado: ESTADOS.DEMO,
        tipo_licencia: 'demo',
        dias_demo: diasDemo,
        dias_licencia: null,
        instalacion_hash,
        fecha_activacion: ahora,
        fecha_expiracion: fechaExpiracion,
        ultima_validacion: ahora,
        ultima_ip: ultima_ip || null,
        version_app: version_app || null
      });
      
      console.log(`[validarLicencia] Licencia DEMO creada para NIT: ${nit}, APP: ${app}, días: ${diasDemo}, expiración: ${fechaExpiracion.toISOString()}`);
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
      licencia.estado = ESTADOS.BLOQUEADO;
      await licencia.save();
      return {
        estado: ESTADOS.BLOQUEADO,
        tipo_licencia: licencia.tipo_licencia,
        expira: licencia.fecha_expiracion,
        dias_restantes: 0,
        instalacion_hash: licencia.instalacion_hash,
        app: licencia.app,
        version_app: version_app || licencia.version_app || null,
        mensaje: "licencia_expirada",
      };
    }

    // Actualizar ultima_validacion = now
    licencia.ultima_validacion = ahora;
    licencia.ultima_ip = ultima_ip || licencia.ultima_ip;
    if (version_app) licencia.version_app = version_app;
    await licencia.save();

    return {
      estado: licencia.estado,
      tipo_licencia: licencia.tipo_licencia,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
      instalacion_hash: licencia.instalacion_hash,
      app: licencia.app,
      version_app: version_app || licencia.version_app || null,
    };
  } catch (error) {
    console.error("Error en validarLicencia:", error.message);
    throw error;
  }
};

// Generar licencia offline firmada
const generarLicenciaOffline = async (nit, instalacion_hash, dias) => {
  try {
    nit = normalizarInput(nit);
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
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // Validar si ya existe → error "ya_existe"
    const licenciaExistente = await Licencia.findOne({ where: { nit, app } });

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
      ultima_validacion: null,
      ultima_ip: null,
      version_app: null
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
    nit = normalizarInput(nit);
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
    const appNormalizado = normalizarInput(data.app);
    const licencia = await Licencia.findOne({ where: { nit, app: appNormalizado } });

    if (!licencia) {
      console.warn(`[registrarLicencia] Intento de registro fallido: No existe licencia para NIT: ${nit}, APP: ${appNormalizado}`);
      return { error: "no_existe", mensaje: `No existe licencia para NIT: ${nit} y APP: ${appNormalizado}` };
    }

    // Validar hash
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash
      licencia.instalacion_hash = instalacion_hash;
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      return { error: "instalacion_invalida", mensaje: "El hash no coincide" };
    }

    // Actualizar licencia
    licencia.estado = ESTADOS.ACTIVA;
    // Solo actualizar fecha_expiracion si viene en el payload y no es null
    // Esto permite que activarOnline controle el cálculo de fecha_expiracion
    if (data.exp) {
      licencia.fecha_expiracion = new Date(data.exp);
    }
    licencia.updated_at = new Date();

    await licencia.save();

    return {
      estado: ESTADOS.ACTIVA,
      tipo_licencia: licencia.tipo_licencia,
      expira: licencia.fecha_expiracion,
      instalacion_hash: licencia.instalacion_hash,
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
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    const SECRET = getSecret();

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
// Ahora maneja todo el flujo: crea licencia si no existe, aplica tipo_licencia, dias_demo, dias_licencia
const activarOnline = async (nit, app, instalacion_hash, tipo_licencia, dias_demo, dias_licencia, ultima_ip, version_app) => {
  try {
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // 1. Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit, app } });

    // Si no existe → crear automáticamente una en modo demo
    if (!licencia) {
      console.log(`[activarOnline] No existe licencia para NIT: ${nit}, APP: ${app}. Creando nueva licencia demo.`);
      const diasDemo = dias_demo || 15;
      
      licencia = await Licencia.create({
        nit,
        app,
        estado: 'demo',
        tipo_licencia: 'demo',
        dias_demo: diasDemo,
        dias_licencia: null,
        instalacion_hash: null,
        fecha_activacion: null,
        fecha_expiracion: null,
        ultima_validacion: null,
        ultima_ip: ultima_ip || null,
        version_app: version_app || null
      });
      
      console.log(`[activarOnline] Licencia demo creada para NIT: ${nit}, APP: ${app}, días_demo: ${diasDemo}`);
    }

    // 2. Validar o asignar instalacion_hash
    if (!licencia.instalacion_hash) {
      // Primera activación: asignar hash
      licencia.instalacion_hash = instalacion_hash;
      console.log(`[activarOnline] Asignado instalacion_hash para NIT: ${nit}, APP: ${app}`);
    } else if (licencia.instalacion_hash !== instalacion_hash) {
      // Hash diferente → error
      console.warn(`[activarOnline] Hash no coincide para NIT: ${nit}, APP: ${app}`);
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    // 3. Leer configuración de la licencia
    // Priorizamos lo que hay en DB si es más "fuerte" (anual/permanente) que lo que viene en el payload (demo)
    let tipoLicenciaConfig = tipo_licencia || licencia.tipo_licencia || 'demo';

    if ((licencia.tipo_licencia === 'anual' || licencia.tipo_licencia === 'permanente') && tipo_licencia === 'demo') {
      console.log(`[activarOnline] Intento de downgrade detectado para NIT: ${nit}, APP: ${app}. Manteniendo tipo: ${licencia.tipo_licencia}`);
      tipoLicenciaConfig = licencia.tipo_licencia;
    }

    const diasDemoConfig = dias_demo !== undefined ? dias_demo : licencia.dias_demo;
    // Si la licencia ya existe en DB y es anual, priorizamos sus días sobre lo que diga el payload para evitar errores
    let diasLicenciaConfig = (licencia.tipo_licencia === 'anual' && licencia.dias_licencia)
      ? licencia.dias_licencia
      : (dias_licencia !== undefined ? dias_licencia : (licencia.dias_licencia || 365));

    console.log(`[activarOnline] Tipo de licencia final: ${tipoLicenciaConfig}`);

    // 4. Aplicar lógica según tipo_licencia
    const ahora = new Date();
    let fechaExpiracion = licencia.fecha_expiracion;
    let diasAplicados = 0;

    // Solo recalculamos la fecha de expiración si:
    // - La licencia no está activa (ej: es nueva o acaba de ser convertida y su estado es 'demo')
    // - O si el tipo de licencia cambió
    // - O si ya expiró (está bloqueada)
    const debeRecalcular = licencia.estado !== ESTADOS.ACTIVA ||
                           licencia.tipo_licencia !== tipoLicenciaConfig ||
                           (licencia.fecha_expiracion && new Date(licencia.fecha_expiracion) < ahora);

    if (debeRecalcular) {
      if (tipoLicenciaConfig === 'demo') {
        diasAplicados = diasDemoConfig || 15;
        fechaExpiracion = new Date(ahora.getTime() + diasAplicados * 24 * 60 * 60 * 1000);
        console.log(`[activarOnline] Recalculando DEMO - NIT: ${nit}, APP: ${app}, Días: ${diasAplicados}, Expiración: ${fechaExpiracion.toISOString()}`);
      } else if (tipoLicenciaConfig === 'anual') {
        diasAplicados = diasLicenciaConfig || 365;
        fechaExpiracion = new Date(ahora.getTime() + diasAplicados * 24 * 60 * 60 * 1000);
        console.log(`[activarOnline] Recalculando ANUAL - NIT: ${nit}, APP: ${app}, Días: ${diasAplicados}, Expiración: ${fechaExpiracion.toISOString()}`);
      } else if (tipoLicenciaConfig === 'permanente') {
        fechaExpiracion = null;
        console.log(`[activarOnline] Recalculando PERMANENTE - Sin expiración`);
      }
      licencia.fecha_activacion = ahora;
      licencia.fecha_expiracion = fechaExpiracion;
    } else {
      console.log(`[activarOnline] Manteniendo fecha de expiración existente: ${fechaExpiracion ? fechaExpiracion.toISOString() : 'NULL'}`);
    }

    // 5. Actualizar campos de la licencia
    licencia.tipo_licencia = tipoLicenciaConfig;
    licencia.estado = ESTADOS.ACTIVA;
    licencia.ultima_validacion = ahora;
    licencia.ultima_ip = ultima_ip || licencia.ultima_ip;
    if (version_app) licencia.version_app = version_app;

    // Guardar dias_demo y dias_licencia según corresponda
    if (dias_demo !== undefined) {
      licencia.dias_demo = dias_demo;
    }
    if (dias_licencia !== undefined) {
      licencia.dias_licencia = dias_licencia;
    }

    await licencia.save();

    console.log(`[activarOnline] Resultado final - NIT: ${nit}, APP: ${app}, Estado: ${ESTADOS.ACTIVA}, Tipo: ${tipoLicenciaConfig}, Expiración: ${fechaExpiracion ? fechaExpiracion.toISOString() : 'NULL'}`);

    // 6. Retornar respuesta con los datos requeridos
    return {
      estado: ESTADOS.ACTIVA,
      tipo_licencia: tipoLicenciaConfig,
      expira: fechaExpiracion,
      dias_restantes: fechaExpiracion ? calcularDiasRestantes(fechaExpiracion) : null,
      instalacion_hash: licencia.instalacion_hash,
      app: licencia.app,
      version_app: version_app || licencia.version_app || null,
    };
  } catch (error) {
    console.error("Error en activarOnline:", error.message);
    throw error;
  }
};

// Convertir licencia demo a real (anual o permanente)
const convertirLicencia = async (nit, app, tipo_licencia, dias_licencia, instalacion_hash) => {
  try {
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // Validar tipo de licencia - debe ser uno de: 'demo', 'anual', 'permanente'
    if (!['demo', 'anual', 'permanente'].includes(tipo_licencia)) {
      throw new Error("tipo_invalido");
    }

    // Si es anual, validar que dias_licencia sea un número positivo
    if (tipo_licencia === 'anual' && (!dias_licencia || typeof dias_licencia !== 'number' || dias_licencia <= 0)) {
      throw new Error("dias_requeridos");
    }

    // 1. Buscar licencia por NIT y APP
    let licencia = await Licencia.findOne({ where: { nit, app } });

    if (!licencia) {
      console.log(`[convertirLicencia] Licencia no encontrada para NIT: '${nit}' (len: ${nit ? nit.length : 0}), APP: '${app}' (len: ${app ? app.length : 0}). Creando nueva para conversión.`);
      const diasDemo = process.env.DIAS_DEMO ? parseInt(process.env.DIAS_DEMO) : 15;

      licencia = await Licencia.create({
        nit,
        app,
        estado: ESTADOS.DEMO,
        tipo_licencia: tipo_licencia,
        dias_demo: diasDemo,
        dias_licencia: tipo_licencia === 'anual' ? dias_licencia : null,
        instalacion_hash: instalacion_hash || null,
        fecha_activacion: null,
        fecha_expiracion: null,
        ultima_validacion: null,
        ultima_ip: null,
        version_app: null
      });

      console.log(`[convertirLicencia] Licencia creada para NIT: ${nit}, APP: ${app}, Tipo: ${tipo_licencia}`);

      return {
        ok: true,
        mensaje: "Licencia creada y lista para activacion",
        tipo_licencia: licencia.tipo_licencia,
        estado: licencia.estado,
      };
    }

    // 2. Validar instalacion_hash si se proporciona
    if (instalacion_hash && licencia.instalacion_hash && licencia.instalacion_hash !== instalacion_hash) {
      return {
        error: "instalacion_invalida",
        mensaje: "El hash de instalación no coincide con el registrado",
      };
    }

    // 3. Actualizar campos
    licencia.tipo_licencia = tipo_licencia;
    licencia.estado = ESTADOS.DEMO; // Forzar estado demo - pendiente de activación

    // Si no tenía hash y se proporcionó uno, asignarlo
    if (!licencia.instalacion_hash && instalacion_hash) {
      licencia.instalacion_hash = instalacion_hash;
    }

    if (tipo_licencia === 'anual') {
      licencia.dias_licencia = dias_licencia;
    } else {
      licencia.dias_licencia = null;
    }

    // Guardar cambios
    await licencia.save();

    console.log(`[convertirLicencia] Licencia convertida a ${tipo_licencia}, pendiente de activacion - NIT: ${nit}, APP: ${app}`);

    return {
      ok: true,
      mensaje: "Licencia actualizada, pendiente de activacion",
      tipo_licencia: licencia.tipo_licencia,
      estado: licencia.estado,
    };
  } catch (error) {
    console.error("Error en convertirLicencia:", error.message);
    throw error;
  }
};

// Obtener estado de la licencia
const obtenerEstado = async (nit, app, instalacion_hash, ultima_ip, version_app) => {
  try {
    nit = normalizarInput(nit);
    app = normalizarInput(app);
    validarApp(app);

    // Buscar licencia
    const licencia = await Licencia.findOne({ where: { nit, app } });

    // Si no existe → error "no_autorizado"
    if (!licencia) {
      return {
        error: "no_autorizado",
        mensaje: "No existe licencia registrada para este NIT",
      };
    }

    // 🔹 Manejo de instalación
    if (!licencia.instalacion_hash) {
      // Primera consulta: asignar hash y guardar
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
      licencia.estado = ESTADOS.BLOQUEADO;
      await licencia.save();
      return {
        estado: ESTADOS.BLOQUEADO,
        tipo_licencia: licencia.tipo_licencia,
        expira: licencia.fecha_expiracion,
        dias_restantes: 0,
        instalacion_hash: licencia.instalacion_hash,
        app: licencia.app,
        version_app: version_app || licencia.version_app || null,
        mensaje: "licencia_expirada",
      };
    }

    // Actualizar ultima_validacion = now
    licencia.ultima_validacion = ahora;
    licencia.ultima_ip = ultima_ip || licencia.ultima_ip;
    if (version_app) licencia.version_app = version_app;
    await licencia.save();

    return {
      estado: licencia.estado,
      tipo_licencia: licencia.tipo_licencia,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
      instalacion_hash: licencia.instalacion_hash,
      app: licencia.app,
      version_app: version_app || licencia.version_app || null,
    };
  } catch (error) {
    console.error("Error en obtenerEstado:", error.message);
    throw error;
  }
};

// Listar todas las licencias
const listarLicencias = async () => {
  try {
    const licencias = await Licencia.findAll({
      order: [['created_at', 'DESC']],
    });
    return licencias;
  } catch (error) {
    console.error("Error en listarLicencias:", error.message);
    throw error;
  }
};

// Editar una licencia existente
const editarLicencia = async (id, datos) => {
  try {
    // Buscar la licencia por ID
    const licencia = await Licencia.findByPk(id);
    
    if (!licencia) {
      throw new Error("no_existe");
    }

    // Campos que se pueden actualizar (excluyendo id y created_at)
    const camposPermitidos = [
      'nit',
      'instalacion_hash',
      'estado',
      'fecha_activacion',
      'fecha_expiracion',
      'dias_demo',
      'ultima_validacion',
      'tipo_licencia',
      'dias_licencia'
    ];

    // Construir objeto de actualización solo con campos permitidos
    const datosActualizacion = {};
    for (const campo of camposPermitidos) {
      if (datos[campo] !== undefined) {
        datosActualizacion[campo] = datos[campo];
      }
    }

    // Ejecutar actualización
    await licencia.update(datosActualizacion);
    
    return {
      ok: true,
      mensaje: "Licencia actualizada correctamente",
      licencia,
    };
  } catch (error) {
    console.error("Error en editarLicencia:", error.message);
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
  obtenerEstado,
  listarLicencias,
  editarLicencia,
};
