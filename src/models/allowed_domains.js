const { DataTypes } = require("sequelize");
const sequelize = require("../config/database"); // Suponiendo que tienes configurada la conexión en `database.js`

const Allowed_domain = sequelize.define(
  "Allowed_domain",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    domain: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "allowed_domains",
    timestamps: true, // Sequelize se encargará de createdAt y updatedAt
  }
);

module.exports = Allowed_domain;
