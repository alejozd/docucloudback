const { TomaTensionSync } = require("../models");
const { Op } = require("sequelize");

const isDateWithoutTime = (dateValue) => {
  return (
    typeof dateValue === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())
  );
};

const parseDate = (dateValue, endOfDay = false) => {
  if (!dateValue) return null;

  const normalizedValue = String(dateValue).trim();
  if (normalizedValue === "") return null;

  if (isDateWithoutTime(normalizedValue)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    return new Date(`${normalizedValue}${suffix}`);
  }

  return new Date(normalizedValue);
};

const syncTomaTension = async (req, res) => {
  try {
    const { paciente_id, sistole, diastole, ritmoCardiaco, fecha_registro } =
      req.body;

    if (
      paciente_id === undefined ||
      sistole === undefined ||
      diastole === undefined ||
      ritmoCardiaco === undefined ||
      !fecha_registro
    ) {
      return res.status(400).json({
        message:
          "Los campos paciente_id, sistole, diastole, ritmoCardiaco y fecha_registro son obligatorios",
      });
    }

    const registro = await TomaTensionSync.create({
      paciente_id,
      sistole,
      diastole,
      ritmoCardiaco,
      fecha_registro,
    });

    return res.status(201).json(registro);
  } catch (error) {
    return res.status(500).json({
      message: "Error al sincronizar toma de tensión",
      error: error.message,
    });
  }
};

const getTomaTensionSync = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, page = "1", limit = "20" } = req.query;

    const pagina = Number.parseInt(page, 10);
    const limite = Number.parseInt(limit, 10);

    if (Number.isNaN(pagina) || pagina < 1) {
      return res.status(400).json({
        message: "El parámetro page debe ser un número mayor o igual a 1",
      });
    }

    if (Number.isNaN(limite) || limite < 1 || limite > 100) {
      return res.status(400).json({
        message:
          "El parámetro limit debe ser un número entre 1 y 100 para paginar resultados",
      });
    }

    const inicio = parseDate(fecha_inicio);
    const fin = parseDate(fecha_fin, true);

    if (fecha_inicio && Number.isNaN(inicio?.getTime())) {
      return res.status(400).json({
        message:
          "El parámetro fecha_inicio no tiene un formato válido (recomendado: YYYY-MM-DD)",
      });
    }

    if (fecha_fin && Number.isNaN(fin?.getTime())) {
      return res.status(400).json({
        message:
          "El parámetro fecha_fin no tiene un formato válido (recomendado: YYYY-MM-DD)",
      });
    }

    if (inicio && fin && inicio > fin) {
      return res.status(400).json({
        message: "fecha_inicio no puede ser mayor que fecha_fin",
      });
    }

    const where = {};
    if (inicio && fin) {
      where.fecha_registro = {
        [Op.gte]: inicio,
        [Op.lte]: fin,
      };
    } else if (inicio) {
      where.fecha_registro = {
        [Op.gte]: inicio,
      };
    } else if (fin) {
      where.fecha_registro = {
        [Op.lte]: fin,
      };
    }

    const offset = (pagina - 1) * limite;

    const { rows: registros, count: total } =
      await TomaTensionSync.findAndCountAll({
        where,
        limit: limite,
        offset,
      order: [["fecha_registro", "DESC"], ["id", "DESC"]],
    });

    return res.status(200).json({
      data: registros,
      pagination: {
        page: pagina,
        limit: limite,
        total,
        totalPages: Math.ceil(total / limite),
      },
      filters: {
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener tomas de tensión sincronizadas",
      error: error.message,
    });
  }
};

module.exports = { syncTomaTension, getTomaTensionSync };
