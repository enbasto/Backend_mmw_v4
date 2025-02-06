const express = require('express');
const router = express.Router();
const reportMessageService = require('../services/reportMessageService');
const authenticateToken = require("../middlewares/authMiddleware"); // Importa el middleware
router.post('/create', async (req, res) => {
  try {
    const { numero_cel, message, urlMedia, estadoEnvio, uuid, cuenta_envio } = req.body;
    const newMessage = await reportMessageService.createReportMessage({
      numero_cel,
      message,
      urlMedia,
      estadoEnvio,
      uuid,
      cuenta_envio,
    });
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const userId = req.user.id;

    const messages = await reportMessageService.getReportMessages(userId);
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


//eliminar todos los registros del usurio
router.delete('/deleteAll', authenticateToken, async (req, res) => {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const userId = req.user.id;
    await reportMessageService.deleteAllReportMessages(userId);
    // res.status(200).json(messages);
    res.json({ message: "Reportes eliminados exitosamente" });
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
