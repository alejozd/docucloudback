const Producto = require("../models/Producto");

// Constantes
const CAMPOS_REQUERIDOS = ["nombre", "referencia", "precio", "codigoBarras"];

// Helpers
const handleServerError = (res, error, context) => {
  console.error(`Error en ${context}:`, error);
  return res.status(500).json({ error: error.message });
};

const parseProductId = (id) => {
  const parsed = parseInt(id, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const validateProductData = (data) => {
  const missing = CAMPOS_REQUERIDOS.filter((campo) => !data[campo]);
  return missing;
};

// Obtener todos los productos
const getAllProductos = async (_req, res) => {
  try {
    const productos = await Producto.findAll();
    return res.status(200).json(productos);
  } catch (error) {
    return handleServerError(res, error, "getAllProductos");
  }
};

// Obtener un producto por ID
const getProductoById = async (req, res) => {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "ID de producto inválido" });
    }

    const producto = await Producto.findByPk(productId);
    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(200).json(producto);
  } catch (error) {
    return handleServerError(res, error, "getProductoById");
  }
};

// Crear un nuevo producto
const createProducto = async (req, res) => {
  try {
    const missingFields = validateProductData(req.body || {});
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Campos requeridos faltantes",
        campos: missingFields,
      });
    }

    const producto = await Producto.create(req.body);
    return res.status(201).json(producto);
  } catch (error) {
    return handleServerError(res, error, "createProducto");
  }
};

// Actualizar un producto
const updateProducto = async (req, res) => {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "ID de producto inválido" });
    }

    const productoExistente = await Producto.findByPk(productId);
    if (!productoExistente) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const [updated] = await Producto.update(req.body, {
      where: { idproducto: productId },
    });

    if (updated === 0) {
      return res.status(200).json({
        message: "No hubo cambios en el producto",
        producto: productoExistente,
      });
    }

    const productoActualizado = await Producto.findByPk(productId);
    return res.status(200).json(productoActualizado);
  } catch (error) {
    return handleServerError(res, error, "updateProducto");
  }
};

// Eliminar un producto
const deleteProducto = async (req, res) => {
  try {
    const productId = parseProductId(req.params.id);
    if (!productId) {
      return res.status(400).json({ error: "ID de producto inválido" });
    }

    const deleted = await Producto.destroy({
      where: { idproducto: productId },
    });

    if (!deleted) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    return res.status(204).send();
  } catch (error) {
    return handleServerError(res, error, "deleteProducto");
  }
};

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
};
