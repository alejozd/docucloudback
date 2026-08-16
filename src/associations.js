const sequelize = require("./config/database");

module.exports = (models) => {
  const {
    Cliente,
    Contacto,
    Segmento,
    AsociarClienteContacto,
    RegistroSolicitud,
    Autorizacion,
    TomaTensionSync,
    Paciente,
  } = models;

  // Asociaciones entre Cliente y Contacto
  Cliente.belongsToMany(Contacto, {
    through: AsociarClienteContacto,
    foreignKey: "idcliente",
    otherKey: "idcontacto",
  });

  Contacto.belongsToMany(Cliente, {
    through: AsociarClienteContacto,
    foreignKey: "idcontacto",
    otherKey: "idcliente",
  });

  // Asociación entre Contacto y Segmento
  Contacto.belongsTo(Segmento, {
    foreignKey: "idsegmento",
    as: "segmento",
  });

  // Asociación entre RegistroSolicitud y Autorizacion
  RegistroSolicitud.belongsTo(Autorizacion, {
    foreignKey: "id_autorizacion", // Clave foránea en RegistroSolicitud
    targetKey: "idautorizacion", // Clave primaria en Autorizacion
    as: "autorizacion",
  });

  Autorizacion.hasMany(RegistroSolicitud, {
    foreignKey: "id_autorizacion", // Clave foránea en RegistroSolicitud
    sourceKey: "idautorizacion", // Clave primaria en Autorizacion
    as: "solicitudes",
  });

  // Asociación entre TomaTensionSync y Paciente. Sin "constraints" (sin FK
  // real a nivel de BD): la tabla toma_tension_sync ya existe en producción
  // y no queremos que un sync() con alter intente forzar una restricción
  // de clave foránea sobre datos existentes. Alcanza con la asociación a
  // nivel de aplicación para poder hacer join/include.
  TomaTensionSync.belongsTo(Paciente, {
    foreignKey: "paciente_id",
    as: "paciente",
    constraints: false,
  });

  Paciente.hasMany(TomaTensionSync, {
    foreignKey: "paciente_id",
    as: "registros",
    constraints: false,
  });
};
