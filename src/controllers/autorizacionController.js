module.exports = ({ Autorizacion, RegistroSolicitud }) => {
  // Función para obtener el estado de autorización por ID
  const getEstadoAutorizacion = async (req, res) => {
    const { id } = req.params; // Obtener el ID de la URL
    const ipCliente = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0]
      : req.socket.remoteAddress;

    try {
      const autorizacion = await Autorizacion.findByPk(id); // Buscar por ID en la tabla "autorizacion"

      if (!autorizacion) {
        return res
          .status(404)
          .json({ error: "No se encontró el registro de autorización" });
      }

      // Guardar en la tabla registro_solicitudes
      await RegistroSolicitud.create({
        ip_cliente: ipCliente,
        id_autorizacion: id,
        estado: autorizacion.estado,
      });

      res.json({
        estado: autorizacion.estado,
        intentos_envio: autorizacion.intentos_envio, // Incluir el contador de intentos
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Nueva función para incrementar los intentos de envío
  const incrementarIntentosEnvio = async (req, res) => {
    const { id } = req.params; // Obtener el ID de la URL

    try {
      const autorizacion = await Autorizacion.findByPk(id);

      if (!autorizacion) {
        return res
          .status(404)
          .json({ error: "No se encontró el registro de autorización" });
      }

      // Incrementar el contador de intentos
      autorizacion.intentos_envio += 1;

      // Validar si se excede el límite de envíos en modo demo
      if (
        autorizacion.estado === "no_autorizado" &&
        autorizacion.intentos_envio > 2
      ) {
        autorizacion.estado = "bloqueado"; // Cambiar el estado a bloqueado
      }

      // Guardar los cambios en la base de datos
      await autorizacion.save();

      // Responder con el estado actualizado y el número de intentos
      res.json({
        estado: autorizacion.estado,
        intentos_envio: autorizacion.intentos_envio,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Función para cambiar el estado de autorización y opcionalmente los intentos
  const cambiarEstadoAutorizacion = async (req, res) => {
    const { id } = req.params; // Obtener el ID de la URL
    const { nuevo_estado, nuevos_intentos } = req.body; // Obtener el nuevo estado y los nuevos intentos

    // Validar que el nuevo estado sea uno de los valores permitidos
    const estadosPermitidos = ["autorizado", "no_autorizado", "bloqueado"];
    if (!estadosPermitidos.includes(nuevo_estado)) {
      return res.status(400).json({
        error:
          "El estado proporcionado no es válido. Debe ser 'autorizado', 'no_autorizado' o 'bloqueado'.",
      });
    }

    try {
      // Buscar el registro de autorización por ID
      const autorizacion = await Autorizacion.findByPk(id);

      if (!autorizacion) {
        return res
          .status(404)
          .json({ error: "No se encontró el registro de autorización" });
      }

      // Actualizar el estado
      autorizacion.estado = nuevo_estado;

      // Actualizar los intentos si se proporciona el campo `nuevos_intentos`
      if (nuevos_intentos !== undefined) {
        // Validar que los nuevos intentos sean un número entero no negativo
        if (
          typeof nuevos_intentos !== "number" ||
          nuevos_intentos < 0 ||
          !Number.isInteger(nuevos_intentos)
        ) {
          return res.status(400).json({
            error:
              "El campo 'nuevos_intentos' debe ser un número entero no negativo.",
          });
        }

        autorizacion.intentos_envio = nuevos_intentos;
      }

      // Guardar los cambios en la base de datos
      await autorizacion.save();

      // Responder con el estado e intentos actualizados
      res.json({
        mensaje: "Estado e intentos actualizados correctamente",
        estado_actual: autorizacion.estado,
        intentos_envio: autorizacion.intentos_envio,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  // Nueva función para obtener el listado de autorizaciones
  const obtenerListadoAutorizaciones = async (req, res) => {
    try {
      // Obtener todos los registros de la tabla "autorizacion"
      const autorizaciones = await Autorizacion.findAll();

      // Responder con el listado de autorizaciones
      res.json({
        total_registros: autorizaciones.length,
        autorizaciones,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  return {
    getEstadoAutorizacion,
    incrementarIntentosEnvio,
    cambiarEstadoAutorizacion,
    obtenerListadoAutorizaciones,
  };
};
