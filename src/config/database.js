const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
  // timezone: '-05:00', // Zona horaria de tu servidor
 
  timezone: '+00:00', // Usar la zona horaria local para escritura en la base de datos
  dialectOptions: {
    // Configurar MySQL para evitar conversiones a UTC en lectura
    timezone: 'local',
  },

});

module.exports = sequelize;
