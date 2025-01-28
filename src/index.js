const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sequelize = require("./config/database");
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
require("dotenv").config();
// Importar asociaciones
require("./associations");

const app = express();
const PORT = process.env.PORT || 3100;
const NODE_ENV = process.env.NODE_ENV || "development"; // Tomar el valor de NODE_ENV o asignar "development" como predeterminado

// Configurar CORS
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

// Ruta de autenticación
app.use("/api", authRoutes);
// Ruta protegida
app.use("/api", reporteRoutes);

// Ruta para la URL raíz
app.get("/", (req, res) => {
  res.send("Welcome to the API! fff");
});

// Sincronizar la base de datos según el entorno
if (NODE_ENV === "development") {
  sequelize
    .sync({ alter: true }) // Usa alter para ajustar las tablas según los modelos sin perder datos
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
