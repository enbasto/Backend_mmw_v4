const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Ajusta la importación según tu configuración
const Message = require('./Messages');  // Asegúrate de que esté correctamente importado
const Grupo = require('./Grupo');

const ScheduledMessage = sequelize.define('ScheduledMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  uuid: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  groupId: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Pendiente', 'Enviado', 'Fallido', 'Enviando'),
    defaultValue: 'Pendiente',
    allowNull: false,
  },
  statusDescripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  scheduledFecha: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  scheduledHora: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'ScheduledMessage',
  tableName: 'scheduledmessages', // Nombre de la tabla en la base de datos
  timestamps: true, // Esto automáticamente manejará `createdAt` y `updatedAt`
});

// Relación inversa: Un ScheduledMessage pertenece a un Message
// Relaciones
ScheduledMessage.belongsTo(Message, { foreignKey: 'message', as: 'msg' });
ScheduledMessage.belongsTo(Grupo, { foreignKey: 'groupId', as: 'gru' });

module.exports = ScheduledMessage;
