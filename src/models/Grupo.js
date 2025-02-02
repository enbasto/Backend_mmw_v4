const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Miembro = require('./Miembro'); // Importa el modelo Miembro

class Grupo extends Model {}

Grupo.init(
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
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      defaultValue: sequelize.fn('uuid'),
      unique: true, // Si deseas que sea único
    },
  },
  {
    sequelize,
    modelName: 'Grupo',
    tableName: 'grupos',
    timestamps: false, // Desactiva los timestamps si no los necesitas
  }
);

// Relación con Miembro
Grupo.hasMany(Miembro, { foreignKey: 'grupoId', as: 'miembros' });
Miembro.belongsTo(Grupo, { foreignKey: 'grupoId', as: 'grupo' });

module.exports = Grupo;
