exports.obtenerVendedores = async (models) => {
  const { Vendedor } = models;
  try {
    const vendedores = await Vendedor.findAll();
    return vendedores;
  } catch (error) {
    throw new Error("Error al obtener los vendedores.");
  }
};

exports.obtenerVendedorPorId = async (models, id) => {
  const { Vendedor } = models;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    return vendedor;
  } catch (error) {
    throw new Error(error.message || "Error al obtener el vendedor.");
  }
};

exports.crearVendedor = async (models, datos) => {
  const { Vendedor } = models;
  const { nombre, telefono } = datos;
  try {
    if (!nombre) {
      throw new Error("El campo 'nombre' es obligatorio.");
    }
    const nuevoVendedor = await Vendedor.create({
      nombre,
      telefono,
    });
    return nuevoVendedor;
  } catch (error) {
    throw new Error(error.message || "Error al crear el vendedor.");
  }
};

exports.actualizarVendedor = async (models, id, datos) => {
  const { Vendedor } = models;
  const { nombre, telefono } = datos;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    await vendedor.update({
      nombre,
      telefono,
    });
    return vendedor;
  } catch (error) {
    throw new Error(error.message || "Error al actualizar el vendedor.");
  }
};

exports.eliminarVendedor = async (models, id) => {
  const { Vendedor } = models;
  try {
    const vendedor = await Vendedor.findByPk(id);
    if (!vendedor) {
      throw new Error("Vendedor no encontrado.");
    }
    await vendedor.destroy();
    return { message: "Vendedor eliminado correctamente." };
  } catch (error) {
    throw new Error(error.message || "Error al eliminar el vendedor.");
  }
};
