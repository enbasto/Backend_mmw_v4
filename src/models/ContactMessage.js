const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Asegúrate de ajustar la ruta a la configuración de tu base de datos

const ContactMessage = sequelize.define('ContactMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW, // Por defecto la fecha y hora actual
  },
}, {
  tableName: 'contact_messages', // Nombre de la tabla en la base de datos
  timestamps: false, // Deshabilita las columnas createdAt y updatedAt automáticas
});

module.exports = ContactMessage;
