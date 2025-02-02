const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payment_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: true, // Puede ser null si no se ha procesado aún
    },
    due_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM(
        "PROCESSING",
        "PENDING",
        "APPROVED",
        "REJECTED",
        "FAILED",
        "VOIDED"
      ),
      defaultValue: "PENDING",
      allowNull: false,
    },
    orderid: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "payments",
    timestamps: false, // Desactivamos timestamps automáticos
  }
);

module.exports = Payment;
