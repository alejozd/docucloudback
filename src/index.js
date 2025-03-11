const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sequelize = require("./config/database");
require("dotenv").config();

// Importar controladores
const serialesERPController = require("./controllers/serialesERPController");
const clientesMediosController = require("./controllers/clientesMediosController");
const clavesMediosGeneradasController = require("./controllers/clavesMediosGeneradasController");

// Importar modelos
const Cliente = require("./models/Cliente")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const Contacto = require("./models/Contacto")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const AsociarClienteContacto = require("./models/AsociarClienteContacto")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const ClienteMedio = require("./models/ClienteMedio")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const SerialERP = require("./models/SerialERP")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const ClaveGenerada = require("./models/ClaveGenerada")(
  sequelize,
  sequelize.Sequelize.DataTypes
);
const Vendedor = require("./models/Vendedor")(
  sequelize,
  sequelize.Sequelize.DataTypes
);

// Importar asociaciones
require("./associations")({
  Cliente,
  Contacto,
  AsociarClienteContacto,
  ClienteMedio,
  SerialERP,
  ClaveGenerada,
  Vendedor,
});

// Importar rutas
const clienteRoutes = require("./routes/clienteRoutes");
const contactoRoutes = require("./routes/contactoRoutes");
const asociarClienteContactoRoutes = require("./routes/asociarClienteContactoRoutes");
const productoRoutes = require("./routes/productoRoutes");
const testRoutes = require("./routes/testRoutes");
const phraseRoutes = require("./routes/phraseRoutes");
const segmentoRoutes = require("./routes/segmentoRoutes");
const authRoutes = require("./routes/authRoutes");
const reporteRoutes = require("./routes/reporteRoutes");
const autorizacionRoutes = require("./routes/autorizacionRoutes");
const registroSolicitudRoutes = require("./routes/registroSolicitudRoutes");
const batteryRoutes = require("./routes/batteryRoutes");
const claveMediosRoutes = require("./routes/claveMediosRoutes");
const clientesMediosRoutes = require("./routes/clientesMediosRoutes");
const serialesERPRoutes = require("./routes/serialesERPRoutes");
const clavesMediosGeneradasRoutes = require("./routes/clavesMediosGeneradasRoutes");
const vendedoresRoutes = require("./routes/vendedoresRoutes");

// Configurar Express
const app = express();
const PORT = process.env.PORT || 3100;
const NODE_ENV = process.env.NODE_ENV || "development"; // Tomar el valor de NODE_ENV o asignar "development" como predeterminado

//Configurar CORS y middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Rutas de API
app.use("/api", clienteRoutes);
app.use("/api", contactoRoutes);
app.use("/api", asociarClienteContactoRoutes);
app.use("/api", productoRoutes);
app.use("/api", testRoutes);
app.use("/api", phraseRoutes);
app.use("/api", segmentoRoutes);
app.use("/api", autorizacionRoutes);
app.use("/api", registroSolicitudRoutes);
app.use("/api", batteryRoutes);
// app.use("/api", claveMediosRoutes);

// Pasar los modelos inicializados a las rutas
app.use(
  "/api",
  claveMediosRoutes({
    SerialERP,
    ClaveGenerada,
  })
);

// Ruta de autenticación
app.use("/api", authRoutes);
// Ruta protegida
app.use("/api", reporteRoutes);

app.use(
  "/api/clientes-medios",
  clientesMediosRoutes({
    ClienteMedio,
    clientesMediosController,
  })
);

app.use(
  "/api/seriales-erp",
  serialesERPRoutes({
    SerialERP,
    ClienteMedio,
    serialesERPController,
  })
);

app.use(
  "/api/claves-medios-generadas",
  clavesMediosGeneradasRoutes({
    ClaveGenerada,
    clavesMediosGeneradasController,
    SerialERP,
  })
);

app.use(
  "/api/vendedores",
  vendedoresRoutes({
    Vendedor,
  })
);

// Ruta para la URL raíz
app.get("/", (req, res) => {
  res.send("Welcome to the API! fff");
});

// Sincronizar la base de datos según el entorno
if (NODE_ENV === "development") {
  sequelize
    .sync({ alter: true }) // Usa alter para ajustar las tablas según los modelos sin perder datos
    // .sync()
    .then(() => {
      console.log("Database synced in development mode");
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
      });
    })
    .catch((error) =>
      console.error("Unable to connect to the database:", error)
    );
} else {
  sequelize
    .authenticate() // Solo verificar conexión en producción, sin modificar tablas
    .then(() => {
      console.log("Database connected successfully");
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
      });
    })
    .catch((error) =>
      console.error("Unable to connect to the database:", error)
    );
}
