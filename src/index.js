const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sequelize = require("./config/database");
const clienteRoutes = require("./routes/clienteRoutes");
const productoRoutes = require("./routes/productoRoutes");
const testRoutes = require("./routes/testRoutes");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3100;

// Configurar CORS
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Rutas de API
app.use("/api", clienteRoutes);
app.use("/api", productoRoutes);
app.use("/api", testRoutes);

// Ruta para la URL raíz
app.get("/", (req, res) => {
  res.send("Welcome to the API! fff");
});

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => console.error("Unable to connect to the database:", error));
