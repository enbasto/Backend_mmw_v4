const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Miembro extends Model {}

Miembro.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    telefono: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    grupoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      defaultValue: sequelize.fn('uuid'),
      unique: true, // Si deseas que sea único
    },
  },
  {
    sequelize,
    modelName: 'Miembro',
    tableName: 'miembros',
    timestamps: false,
  }
);

module.exports = Miembro;
