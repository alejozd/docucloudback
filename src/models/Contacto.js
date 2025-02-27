module.exports = (sequelize, DataTypes) => {
  const Contacto = sequelize.define(
    "contactos",
    {
      idcontacto: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nombresca: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      identidadca: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      direccionca: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      telefonoca: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      emailca: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idsegmento: {
        type: DataTypes.INTEGER,
        references: {
          model: "segmentos", // Nombre de la tabla referenciada
          key: "idsegmento",
        },
      },
    },
    {
      tableName: "contactos", // Asegúrate de que el nombre de la tabla sea correcto
      timestamps: false, // Desactiva las marcas de tiempo si no están en tu tabla
    }
  );

  // Asociaciones
  Contacto.associate = (models) => {
    Contacto.belongsTo(models.Segmento, { foreignKey: "idsegmento" });
  };

  return Contacto;
};
