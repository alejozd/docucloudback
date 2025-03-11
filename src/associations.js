const sequelize = require("./config/database");

module.exports = (models) => {
  const {
    Cliente,
    Contacto,
    AsociarClienteContacto,
    ClienteMedio,
    SerialERP,
    ClaveGenerada,
    Vendedor,
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

  // Asociaciones para las nuevas tablas
  ClienteMedio.hasMany(SerialERP, {
    foreignKey: "cliente_id",
    as: "seriales",
  });

  SerialERP.belongsTo(ClienteMedio, {
    foreignKey: "cliente_id",
    as: "cliente",
  });

  SerialERP.hasMany(ClaveGenerada, {
    foreignKey: "serial_erp_id",
    as: "claves",
  });

  ClaveGenerada.belongsTo(SerialERP, {
    foreignKey: "serial_erp_id",
    as: "serial",
  });

  ClienteMedio.belongsTo(Vendedor, {
    foreignKey: "vendedor_id",
    as: "vendedor",
  });
  Vendedor.hasMany(ClienteMedio, {
    foreignKey: "vendedor_id",
    as: "clientes",
  });
};
