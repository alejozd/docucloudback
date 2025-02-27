module.exports = (sequelize, DataTypes) => {
  const ClaveGenerada = sequelize.define(
    "ClaveGenerada", // Nombre del modelo
    {
      mac_servidor: {
        type: DataTypes.STRING(17),
        allowNull: false,
      },
      clave_generada: {
        type: DataTypes.STRING(32),
        allowNull: false,
      },
      generado_en: {
        type: DataTypes.DATE, // Tipo de dato para fechas
        defaultValue: DataTypes.NOW, // Valor predeterminado: fecha y hora actual
      },
    },
    {
      tableName: "claves_medios_generadas", // Nombre de la tabla en la base de datos
      timestamps: false, // Desactiva las marcas de tiempo automáticas (createdAt y updatedAt)
    }
  );

  // Asociaciones
  ClaveGenerada.associate = (models) => {
    ClaveGenerada.belongsTo(models.SerialERP, {
      foreignKey: "serial_erp_id",
      as: "serial",
    });
  };

  return ClaveGenerada;
};
