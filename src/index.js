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
const videoController = require("./controllers/videoController");

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
// app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// [3] SERVIR ARCHIVOS ESTÁTICOS (VIDEOS)
// ¡IMPORTANTE! Ajusta 'videos' al directorio REAL donde Express debe buscar los archivos.
// Si tus videos están en `/var/www/videos`, deberías usar `express.static('/var/www/videos')`
// app.use(
//   "/videos",
//   express.static(path.join(__dirname, "..", "..", "videos_servidos"))
// );

// --- CONFIGURACIÓN DE SERVICIO DE ARCHIVOS ESTÁTICOS ---
// Define la misma ruta base que usas en videoController.js para servir los archivos
// Si estás usando la ruta local de Windows:
// const LOCAL_VIDEO_BASE_DIR = "C:/Users/Alejandro Zambrano/Documents/Alejo";
// Si estás en Linux/Ubuntu:
const LINUX_VIDEO_BASE_DIR = "/var/www/videos";

app.use(
  "/videos",
  express.static(LINUX_VIDEO_BASE_DIR, {
    // Configura el encabezado Cache-Control: public, max-age=...
    // 31536000 segundos = 1 año. Cloudflare y el navegador lo guardarán localmente por este tiempo.
    maxAge: "1y",
    // Opcional pero recomendado para streaming: asegura que el servidor envía el encabezado
    setHeaders: (res, path, stat) => {
      // Solo aplica para archivos MP4 o de video
      if (path.endsWith(".mp4") || path.endsWith(".webm")) {
        res.set("Accept-Ranges", "bytes");
      }
    },
  })
);

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

// Función centralizada para cargar la caché y levantar el servidor
async function loadCacheAndStartServer(databaseSyncPromise) {
  try {
    // Espera a que la BD esté lista (sea sync o authenticate)
    await databaseSyncPromise;
    console.log("Database connection established.");

    // [CLAVE] Carga de Caché ÚNICA
    console.log("Cargando caché de videos (demora única en el inicio)...");
    try {
      // La variable global.videoCache se define aquí
      global.videoCache = await videoController.scanAndProcessVideos();
      console.log(
        `✅ Caché de videos cargada. Total: ${global.videoCache.length} videos.`
      );
    } catch (e) {
      console.error("❌ ERROR FATAL al cargar la caché de videos:", e.message);
      global.videoCache = []; // Si falla, inicializa vacío para no romper la app
    }

    // Inicia el servidor
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
    });
  } catch (error) {
    console.error("Unable to connect to the database or start server:", error);
  }
}

// Lógica de inicio según el entorno
if (NODE_ENV === "development") {
  // En desarrollo: sincronizar BD (con alter) y luego cargar la caché
  const dbPromise = sequelize.sync({ alter: true });
  loadCacheAndStartServer(dbPromise);
} else {
  // En producción: solo autenticar (conectar) BD y luego cargar la caché
  const dbPromise = sequelize.authenticate();
  loadCacheAndStartServer(dbPromise);
}
