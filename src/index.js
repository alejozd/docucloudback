const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const path = require("path");
const {
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
} = require("./models");

// Importar controladores
const serialesERPController = require("./controllers/serialesERPController");
const clientesMediosController = require("./controllers/clientesMediosController");
const clavesMediosGeneradasController = require("./controllers/clavesMediosGeneradasController");

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
const ventaRoutes = require("./routes/ventaRoutes");
const pagoRoutes = require("./routes/pagoRoutes");
const grabacionRoutes = require("./routes/grabacionRoutes");
const videoRoutes = require("./routes/videoRoutes");

// Configurar Express
const app = express();
const PORT = process.env.PORT || 3100;
const NODE_ENV = process.env.NODE_ENV || "development";

//Configurar CORS y middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// --- CONFIGURACIÓN DE SERVICIO DE ARCHIVOS ESTÁTICOS ---
// Define la misma ruta base que usas en videoController.js para servir los archivos
// Si estás usando la ruta local de Windows:
// const LOCAL_VIDEO_BASE_DIR = "C:/Users/Alejandro Zambrano/Documents/Alejo";
// Si estás en Linux/Ubuntu:
const LINUX_VIDEO_BASE_DIR = "/var/www/videos";

// NUEVO: Ruta para servir los videos como archivos estáticos
// Esto mapea la URL "/videos" a tu directorio local "C:/Users/Alejandro Zambrano/Documents/Alejo"
// app.use("/videos", express.static(LOCAL_VIDEO_BASE_DIR));
// Cuando pases a Ubuntu, cambiarías la línea de arriba por:
app.use("/videos", express.static(LINUX_VIDEO_BASE_DIR));

// Rutas de API
app.use("/api", clienteRoutes);
app.use("/api", contactoRoutes);
app.use("/api", asociarClienteContactoRoutes);
app.use("/api", productoRoutes);
app.use("/api", testRoutes);
app.use("/api", phraseRoutes);
app.use("/api", segmentoRoutes);
app.use("/api", batteryRoutes);
app.use("/api/grabacion", grabacionRoutes);
// Ruta para servir las grabaciones como archivos estáticos
app.use("/grabaciones", express.static("/var/www/radio_grabaciones"));
// Ruta para servir los videos
app.use("/api/video", videoRoutes);

// Pasar modelos a rutas que lo necesitan
app.use("/api", claveMediosRoutes({ SerialERP, ClaveGenerada }));
app.use("/api", authRoutes);
app.use("/api", reporteRoutes);
app.use(
  "/api/clientes-medios",
  clientesMediosRoutes({ ClienteMedio, clientesMediosController, Vendedor })
);
app.use(
  "/api/seriales-erp",
  serialesERPRoutes({ SerialERP, ClienteMedio, serialesERPController })
);
app.use(
  "/api/claves-medios-generadas",
  clavesMediosGeneradasRoutes({
    ClaveGenerada,
    clavesMediosGeneradasController,
    SerialERP,
    ClienteMedio,
  })
);
app.use("/api/vendedores", vendedoresRoutes({ Vendedor, Venta, Pago }));
app.use("/api/ventas", ventaRoutes({ Venta, Vendedor, ClienteMedio }));
app.use("/api/pagos", pagoRoutes({ Pago, Venta }));
app.use(
  "/api/registro-solicitudes",
  registroSolicitudRoutes({ RegistroSolicitud, Autorizacion })
);
app.use("/api", autorizacionRoutes({ Autorizacion, RegistroSolicitud }));

// Ruta para la URL raíz
app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// Sincronizar la base de datos según el entorno
if (NODE_ENV === "development") {
  sequelize
    .sync({ alter: true })
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
    .authenticate()
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
