const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Importar modelos
const Cliente = require("./Cliente")(sequelize, Sequelize.DataTypes);
const Contacto = require("./Contacto")(sequelize, Sequelize.DataTypes);
const Segmento = require("./Segmento");
const AsociarClienteContacto = require("./AsociarClienteContacto")(
  sequelize,
  Sequelize.DataTypes
);
const RegistroSolicitud = require("./RegistroSolicitud")(
  sequelize,
  Sequelize.DataTypes
);
const Autorizacion = require("./Autorizacion")(sequelize, Sequelize.DataTypes);
const TomaTensionSync = require("./TomaTensionSync")(
  sequelize,
  Sequelize.DataTypes
);
const Licencia = require("./Licencia")(sequelize, Sequelize.DataTypes);
const Paciente = require("./Paciente")(sequelize, Sequelize.DataTypes);

// Importar asociaciones
require("../associations")({
  Cliente,
  Contacto,
  Segmento,
  AsociarClienteContacto,
  RegistroSolicitud,
  Autorizacion,
  TomaTensionSync,
  Paciente,
});

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Cliente,
  Contacto,
  Segmento,
  AsociarClienteContacto,
  RegistroSolicitud,
  Autorizacion,
  TomaTensionSync,
  Licencia,
  Paciente,
};
