const { Op } = require('sequelize');
const Licencia = require('../models/Licencia');
const { calcularDiasRestantes, generarFirmaOffline } = require('../helpers/licenciaHelper');

/**
 * Activa una licencia (primera vez → demo)
 * @param {string} nit - NIT del cliente
 * @param {string} instalacion_hash - Hash de instalación
 * @param {string} app - Nombre de la aplicación
 * @returns {Promise<Object>} - Estado de la licencia
 */
const activarLicencia = async (nit, instalacion_hash, app) => {
  try {
    // Buscar licencia por NIT
    let licencia = await Licencia.findOne({ where: { nit } });

    if (!licencia) {
      // NO existe: crear con estado = 'demo'
      const fechaActivacion = new Date();
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 15); // 15 días por defecto

      licencia = await Licencia.create({
        nit,
        instalacion_hash,
        estado: 'demo',
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
    const diasRestantes = calcularDiasRestantes(licencia.fecha_expiracion);
    
    if (diasRestantes < 0 && licencia.estado !== 'bloqueado') {
      licencia.estado = 'bloqueado';
      await licencia.save();
      return {
        estado: 'bloqueado',
        expira: licencia.fecha_expiracion,
        dias_restantes: diasRestantes,
      };
    }

    // Validar si instalacion_hash es diferente → rechazar
    if (licencia.instalacion_hash !== instalacion_hash) {
      throw new Error('instalacion_invalida');
    }

    return {
      estado: licencia.estado,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
    };
  } catch (error) {
    if (error.message === 'instalacion_invalida') {
      throw error;
    }
    throw new Error(`Error al activar licencia: ${error.message}`);
  }
};

/**
 * Valida una licencia (uso normal)
 * @param {string} nit - NIT del cliente
 * @param {string} instalacion_hash - Hash de instalación
 * @returns {Promise<Object>} - Estado de la licencia
 */
const validarLicencia = async (nit, instalacion_hash) => {
  try {
    // Buscar licencia
    const licencia = await Licencia.findOne({ where: { nit } });

    // Si no existe → error "no_autorizado"
    if (!licencia) {
      throw new Error('no_autorizado');
    }

    // Si instalacion_hash no coincide → error
    if (licencia.instalacion_hash !== instalacion_hash) {
      throw new Error('instalacion_invalida');
    }

    // Si expiró → estado = bloqueado
    const diasRestantes = calcularDiasRestantes(licencia.fecha_expiracion);
    
    if (diasRestantes < 0 && licencia.estado !== 'bloqueado') {
      licencia.estado = 'bloqueado';
      await licencia.save();
      throw new Error('licencia_expirada');
    }

    // actualizar ultima_validacion = now
    licencia.ultima_validacion = new Date();
    await licencia.save();

    return {
      estado: licencia.estado,
      expira: licencia.fecha_expiracion,
      dias_restantes: calcularDiasRestantes(licencia.fecha_expiracion),
    };
  } catch (error) {
    if (['no_autorizado', 'instalacion_invalida', 'licencia_expirada'].includes(error.message)) {
      throw error;
    }
    throw new Error(`Error al validar licencia: ${error.message}`);
  }
};

/**
 * Genera licencia offline firmada (para contingencias)
 * @param {string} nit - NIT del cliente
 * @param {string} instalacion_hash - Hash de instalación
 * @param {number} dias - Días de validez
 * @returns {Promise<Object>} - Licencia y firma
 */
const generarLicenciaOffline = async (nit, instalacion_hash, dias) => {
  try {
    const secretKey = process.env.SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('SECRET_KEY no configurada en .env');
    }

    // Construir objeto de licencia
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + dias);
    const expira = fechaExpiracion.toISOString();

    const licenciaObj = {
      nit,
      instalacion: instalacion_hash,
      expira,
      tipo: 'offline',
    };

    // Generar firma con SHA256(nit + instalacion + expira + SECRET_KEY)
    const firma = generarFirmaOffline(nit, instalacion_hash, expira, secretKey);

    return {
      licencia: licenciaObj,
      firma,
    };
  } catch (error) {
    throw new Error(`Error al generar licencia offline: ${error.message}`);
  }
};

module.exports = {
  activarLicencia,
  validarLicencia,
  generarLicenciaOffline,
};
