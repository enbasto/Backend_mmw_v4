const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Ajusta la importación según tu configuración
// const ScheduledMessage = require('./ScheduledMessage');  // Asegúrate de que esté correctamente importado

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  abreviacion: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING(1000),
    allowNull: false,
  },
  media: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  urlMedia: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  intervaloMessage: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uuid: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'messages',
  timestamps: false, // Si no usas columnas de timestamps como createdAt y updatedAt
});

// Relación: Un Message puede tener muchos ScheduledMessages
// Message.hasMany(ScheduledMessage, { foreignKey: 'message', as: 'scheduledMessages' });

module.exports = Message;
