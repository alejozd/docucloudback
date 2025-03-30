const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

// Importar modelos
const Cliente = require("./Cliente")(sequelize, Sequelize.DataTypes);
const Contacto = require("./Contacto")(sequelize, Sequelize.DataTypes);
const AsociarClienteContacto = require("./AsociarClienteContacto")(
  sequelize,
  Sequelize.DataTypes
);
const ClienteMedio = require("./ClienteMedio")(sequelize, Sequelize.DataTypes);
const SerialERP = require("./SerialERP")(sequelize, Sequelize.DataTypes);
const ClaveGenerada = require("./ClaveGenerada")(
  sequelize,
  Sequelize.DataTypes
);
const Vendedor = require("./Vendedor")(sequelize, Sequelize.DataTypes);
const Venta = require("./Venta")(sequelize, Sequelize.DataTypes);
const Pago = require("./Pago")(sequelize, Sequelize.DataTypes);
const RegistroSolicitud = require("./RegistroSolicitud")(
  sequelize,
  Sequelize.DataTypes
);
const Autorizacion = require("./Autorizacion")(sequelize, Sequelize.DataTypes);

// Importar asociaciones
require("../associations")({
  Cliente,
  Contacto,
  AsociarClienteContacto,
  ClienteMedio,
  SerialERP,
  ClaveGenerada,
  Vendedor,
  Venta,
  Pago,
  RegistroSolicitud,
  Autorizacion,
});

// Exportar modelos y conexión
module.exports = {
  sequelize,
  Cliente,
  Contacto,
  AsociarClienteContacto,
  ClienteMedio,
  SerialERP,
  ClaveGenerada,
  Vendedor,
  Venta,
  Pago,
  RegistroSolicitud,
  Autorizacion,
};
