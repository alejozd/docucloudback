module.exports = (sequelize, DataTypes) => {
  const TomaTensionSync = sequelize.define(
    "TomaTensionSync",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      paciente_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sistole: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      diastole: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ritmoCardiaco: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "toma_tension_sync",
      timestamps: false,
    }
  );

  return TomaTensionSync;
};
