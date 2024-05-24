const express = require("express");
const {
  getAllProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} = require("../controllers/productoController");

const router = express.Router();

router.get("/productos", getAllProductos);
router.post("/productos", createProducto);
router.put("/productos/:id", updateProducto);
router.delete("/productos/:id", deleteProducto);

module.exports = router;
