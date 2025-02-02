const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authMiddleware"); // Importa el middleware
const User = require("../models/user"); // Modelo User
const Payment = require("../models/payments"); // Modelo Payment
const { Op } = require("sequelize"); // Asegúrate de importar Op

router.post("/validate-payment", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Buscar al usuario
    const user = await User.findOne({ where: { uuid: userId } });

    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const currentDate = new Date();

    // Verificar si el usuario está en periodo de prueba gratuita
    

    // Verificar si el usuario tiene pagos válidos
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const payment = await Payment.findOne({
      where: {
        uuid: userId,
        payment_status: "APPROVED",
        payment_date: {
          [Op.between]: [firstDayOfMonth, lastDayOfMonth],
        },
      },
    });

    if (payment) {
      return res.status(200).json({
        message: "El usuario ha realizado el pago para este mes.",
        paymentDetails: payment,
        isFreeTrial: false,
        isPayment: true
      });
    }
    if (user.free_trial_end && new Date(user.free_trial_end) >= currentDate) {
      return res.status(200).json({
        message: "El usuario está en periodo de prueba gratuita.",
        freeTrialEnd: user.free_trial_end,
        isFreeTrial: true,
        isPayment: false,
      });
    }
    // Si no está en periodo de prueba y no tiene pagos válidos
    return res.status(403).json({
      message:
        "El usuario no tiene periodo de prueba activo ni ha realizado el pago.",
      isFreeTrial: false,
      isPayment: false,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

router.post("/payments-user", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    // Buscar al usuario junto con sus pagos aprobados
    const user = await User.findOne({ where: { uuid: userId } });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const currentDate = new Date();

    const payment = await Payment.findAll({
      where: {
        uuid: userId,
      },
    });
    

    const lastApprovedPayment = payment
      .filter((p) => p.payment_status === "APPROVED")
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
      .slice(0, 1); // Toma el último pago aprobado

    console.log(lastApprovedPayment);

    // Obtener el último pago aprobado
    // const lastPayment = user.Payments?.[0] || null;
    console.log(payment.length);

    if (payment.length > 0) {
      if (lastApprovedPayment.length > 0) {
        const lastPayment = lastApprovedPayment[0]; // Extrae el objeto del array
        const today = new Date();
        const dueDate = new Date(lastPayment.due_date);

        if (dueDate < today) {
          return res.status(200).json({
            message: "El usuario no ha pagado la mensualidad.",
            userInfo: user,
            payments: payment,
            isFreeTrial: false,
            membershipExpires: lastPayment.due_date, // Fecha en la que expiró
          });
        }

        return res.status(200).json({
          message: "El usuario tiene pagos registrados.",
          userInfo: user,
          payments: payment,
          isFreeTrial: false,
          membershipExpires: lastPayment.due_date,
        });
      }
      return res.status(200).json({
        message: "El usuario registra pagos pendientes.",
        userInfo: user,
        payments: payment,
        isFreeTrial: false,
        membershipExpires: null,
      });
    }

    // Verificar si está en periodo de prueba
    if (user.free_trial_end && new Date(user.free_trial_end) >= currentDate) {
      return res.status(200).json({
        message: "El usuario está en periodo de prueba gratuita.",
        userInfo: user,
        freeTrialEnd: user.free_trial_end,
        isFreeTrial: true,
        payments: payment,
        membershipExpires: user.free_trial_end,
      });
    }

    // No tiene pagos ni está en periodo de prueba
    return res.status(403).json({
      message:
        "El usuario no tiene periodo de prueba activo ni ha realizado el pago.",
      userInfo: user,
      isFreeTrial: false,
      payments: [],
      membershipExpires: null,
    });
  } catch (error) {
    console.error("Error en payments-user:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
});

module.exports = router;
