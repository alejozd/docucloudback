// Script manual, no se ejecuta automáticamente en producción (NODE_ENV
// distinto de "development" no hace sequelize.sync). Correr una sola vez:
//   node src/scripts/seedPacientes.js
//
// Es idempotente: usa findOrCreate, así que se puede correr más de una vez
// sin duplicar ni pisar datos existentes.
require("dotenv").config();
const { sequelize, Paciente } = require("../models");

const PACIENTES_SEED = [
  { id: 1, nombre: "José Luis" },
  { id: 2, nombre: "Alejandro" },
];

async function seedPacientes() {
  await sequelize.authenticate();
  console.log("Conectado a la base de datos.");

  await Paciente.sync();
  console.log('Tabla "pacientes" verificada/creada.');

  for (const datos of PACIENTES_SEED) {
    const [paciente, creado] = await Paciente.findOrCreate({
      where: { id: datos.id },
      defaults: datos,
    });
    console.log(
      creado
        ? `Creado: ${paciente.id} - ${paciente.nombre}`
        : `Ya existía: ${paciente.id} - ${paciente.nombre}`
    );
  }
}

seedPacientes()
  .then(() => {
    console.log("Listo.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error al sembrar pacientes:", error);
    process.exit(1);
  });
