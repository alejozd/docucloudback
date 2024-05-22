const express = require("express");
const sequelize = require("./config/database");
const clienteRoutes = require("./routes/clienteRoutes");
const testRoutes = require("./routes/testRoutes");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", clienteRoutes);
app.use("/api", testRoutes); // Añadir esta línea

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
