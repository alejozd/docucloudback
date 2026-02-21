const Producto = require("../../models/Producto");

jest.mock("../../models/Producto", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
}));

const {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
} = require("../productoController");

// Helper para crear objetos res mock
const createMockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

describe("productoController", () => {
  describe("getAllProductos", () => {
    it("debe retornar 200 con la lista de productos", async () => {
      const productos = [
        { idproducto: 1, nombre: "Producto 1", referencia: "REF1", precio: 10, codigoBarras: "123" },
      ];
      Producto.findAll.mockResolvedValue(productos);

      const res = createMockRes();
      await getAllProductos({}, res);

      expect(Producto.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(productos);
    });

    it("debe retornar 500 cuando la BD falla", async () => {
      Producto.findAll.mockRejectedValue(new Error("Error de conexión"));

      const res = createMockRes();
      await getAllProductos({}, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error de conexión" });
    });
  });

  describe("getProductoById", () => {
    it("debe retornar 200 con el producto cuando existe", async () => {
      const producto = { idproducto: 1, nombre: "Producto 1", referencia: "REF1", precio: 10, codigoBarras: "123" };
      Producto.findByPk.mockResolvedValue(producto);

      const res = createMockRes();
      await getProductoById({ params: { id: "1" } }, res);

      expect(Producto.findByPk).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(producto);
    });

    it("debe retornar 400 cuando el ID no es válido", async () => {
      const res = createMockRes();
      await getProductoById({ params: { id: "abc" } }, res);

      expect(Producto.findByPk).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "ID de producto inválido" });
    });

    it("debe retornar 404 cuando el producto no existe", async () => {
      Producto.findByPk.mockResolvedValue(null);

      const res = createMockRes();
      await getProductoById({ params: { id: "999" } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Producto no encontrado" });
    });
  });

  describe("createProducto", () => {
    const productoValido = {
      nombre: "Producto Nuevo",
      referencia: "REF-NEW",
      precio: 99.99,
      codigoBarras: "7890123456789",
    };

    it("debe crear y retornar 201 con el producto creado", async () => {
      const productoCreado = { idproducto: 1, ...productoValido };
      Producto.create.mockResolvedValue(productoCreado);

      const res = createMockRes();
      await createProducto({ body: productoValido }, res);

      expect(Producto.create).toHaveBeenCalledWith(productoValido);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(productoCreado);
    });

    it("debe retornar 400 cuando faltan campos requeridos", async () => {
      const res = createMockRes();
      await createProducto({ body: { nombre: "Solo nombre" } }, res);

      expect(Producto.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Campos requeridos faltantes",
        campos: expect.arrayContaining(["referencia", "precio", "codigoBarras"]),
      });
    });

    it("debe retornar 400 cuando body es null/undefined", async () => {
      const res = createMockRes();
      await createProducto({ body: null }, res);

      expect(Producto.create).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("updateProducto", () => {
    const productoExistente = {
      idproducto: 1,
      nombre: "Original",
      referencia: "REF1",
      precio: 10,
      codigoBarras: "123",
    };

    it("debe actualizar y retornar 200 con el producto actualizado", async () => {
      Producto.findByPk
        .mockResolvedValueOnce(productoExistente)
        .mockResolvedValueOnce({ ...productoExistente, nombre: "Actualizado" });
      Producto.update.mockResolvedValue([1]);

      const res = createMockRes();
      await updateProducto(
        { params: { id: "1" }, body: { nombre: "Actualizado" } },
        res
      );

      expect(Producto.update).toHaveBeenCalledWith(
        { nombre: "Actualizado" },
        { where: { idproducto: 1 } }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Actualizado" })
      );
    });

    it("debe retornar 400 cuando el ID no es válido", async () => {
      const res = createMockRes();
      await updateProducto({ params: { id: "xyz" }, body: {} }, res);

      expect(Producto.findByPk).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "ID de producto inválido" });
    });

    it("debe retornar 404 cuando el producto no existe", async () => {
      Producto.findByPk.mockResolvedValue(null);

      const res = createMockRes();
      await updateProducto({ params: { id: "999" }, body: { nombre: "Nuevo" } }, res);

      expect(Producto.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Producto no encontrado" });
    });

    it("debe retornar 200 con mensaje cuando no hay cambios (updated === 0)", async () => {
      Producto.findByPk.mockResolvedValue(productoExistente);
      Producto.update.mockResolvedValue([0]);

      const res = createMockRes();
      await updateProducto(
        { params: { id: "1" }, body: { nombre: "Original" } },
        res
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "No hubo cambios en el producto",
        producto: productoExistente,
      });
    });
  });

  describe("deleteProducto", () => {
    it("debe eliminar y retornar 204 cuando el producto existe", async () => {
      Producto.destroy.mockResolvedValue(1);

      const res = createMockRes();
      await deleteProducto({ params: { id: "1" } }, res);

      expect(Producto.destroy).toHaveBeenCalledWith({ where: { idproducto: 1 } });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("debe retornar 404 cuando el producto no existe", async () => {
      Producto.destroy.mockResolvedValue(0);

      const res = createMockRes();
      await deleteProducto({ params: { id: "999" } }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Producto no encontrado" });
    });

    it("debe retornar 400 cuando el ID no es válido", async () => {
      const res = createMockRes();
      await deleteProducto({ params: { id: "no-numero" } }, res);

      expect(Producto.destroy).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "ID de producto inválido" });
    });
  });
});
