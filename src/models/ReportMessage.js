const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportMessage = sequelize.define('ReportMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  numero_cel: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  urlMedia: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  estadoEnvio: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  uuid: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true,
  },
  nombre_contacto: {  
    type: DataTypes.STRING(255),
    allowNull: true, // Si quieres que sea opcional
  },
  hora_envio: {  
    type: DataTypes.STRING(8), // Formato HH:mm:ss
    allowNull: false,
    defaultValue: () => {
      const now = new Date();
      return now.toTimeString().split(' ')[0]; // Obtiene la hora en formato HH:mm:ss
    },
  },
  fecha_envio: {  
    type: DataTypes.STRING(10), // Formato YYYY-MM-DD
    allowNull: false,
    defaultValue: () => {
      const now = new Date();
      return now.toISOString().split('T')[0]; // Obtiene la fecha en formato YYYY-MM-DD
    },
  },
  grupo: {  
    type: DataTypes.STRING(255),
    allowNull: true, // Si quieres que sea opcional
  },
  cuenta_envio: {  
    type: DataTypes.STRING(255),
    allowNull: false, // Si quieres que sea opcional
  },
}, {
  tableName: 'reportmessage',
  timestamps: false,  // Si no tienes campos createdAt y updatedAt
});

module.exports = ReportMessage;
