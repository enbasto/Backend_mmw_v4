const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // Suponiendo que tienes configurada la conexión en `database.js`

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombres: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    apellidos: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true, // El email debe ser único
    },
    hashed_password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
    },
    salt: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    numero_celular: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    genero: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    verificacion_email: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    password_changed: {
      // Nueva columna
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Valor por defecto es false
    },
    free_trial_end: {
      type: DataTypes.DATE,
      allowNull: true, // Permitir valores nulos
      defaultValue: null, // Usar null como valor por defecto,
    },
  },
  {
    tableName: "users",
    timestamps: true, // Sequelize se encargará de createdAt y updatedAt
  }
);

module.exports = User;
