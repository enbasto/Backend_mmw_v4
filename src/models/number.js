// models/Number.js

const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Asegúrate de que la ruta es correcta

class Number extends Model {}

Number.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false, // Cambia a true si 'nombre' es obligatorio
    },
    numero_cel: {
      type: DataTypes.STRING(20),
      allowNull: false, // Cambia a true si 'numero_cel' es obligatorio
    },
    uuid: {
      type: DataTypes.CHAR(36),
      allowNull: false, // Cambia a true si 'uuid' es obligatorio
      unique: true, // Asegura que 'uuid' sea único
    },
  },
  {
    sequelize, // Pasamos la instancia de sequelize
    modelName: 'Number', // Nombre del modelo
    tableName: 'numbers', // Nombre de la tabla en la base de datos
    timestamps: false, // Cambia a true si tienes columnas createdAt y updatedAt
  }
);

module.exports = Number;
