const Cliente = require("./models/Cliente");
const Contacto = require("./models/Contacto");
const AsociarClienteContacto = require("./models/AsociarClienteContacto");

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
