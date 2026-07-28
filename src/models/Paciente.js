module.exports = (sequelize, DataTypes) => {
  const Paciente = sequelize.define(
    "Paciente",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: false,
      },
      nombre: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "pacientes",
      timestamps: false,
    }
  );

  return Paciente;
};
