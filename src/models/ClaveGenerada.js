module.exports = (sequelize, DataTypes) => {
  const ClaveGenerada = sequelize.define(
    "ClaveGenerada",
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
      serial_erp_id: {
        type: DataTypes.BIGINT.UNSIGNED, // Coincide con el tipo en la base de datos
        allowNull: true, // Permitir valores nulos para cumplir con ON DELETE SET NULL
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
      onDelete: "SET NULL", // Configurar ON DELETE SET NULL
      onUpdate: "CASCADE", // Configurar ON UPDATE CASCADE
    });
  };

  return ClaveGenerada;
};
