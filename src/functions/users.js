const userService = require("../services/userService.js");
const Payment = require("../models/payments"); // Modelo Payment
const { Op } = require("sequelize"); // Asegúrate de importar Op
require("dotenv").config();

const amountSendFree = Number(process.env.CANTIDAD_ENVIOS_PRUEBA || 30);

const canSendMessages = async (userId) => {
  const user = await userService.getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  const currentDate = new Date();

  const payment = await Payment.findOne({
    where: {
      uuid: userId,
      payment_status: "APPROVED",
      due_date: {
        [Op.gte]: currentDate,
      },
    },
  });

  if (payment) {
    return true;
  }

  const enPeriodoPrueba =
    user.free_trial_end && new Date(user.free_trial_end) > currentDate;

  if (!enPeriodoPrueba || user.messages_sent >= amountSendFree) {
    return false;
  }

  return true;
};

const incrementSendMessages = async (userId, cantidad) => {
  const responseUpdate = await userService.incrementMessagesSent(
    userId,
    cantidad
  );
  if (!responseUpdate) {
    throw new Error("Usuario no encontrado");
  }
  return true;
};

module.exports = {
  canSendMessages,
  incrementSendMessages,
};
