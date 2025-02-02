const express = require('express');
const moment = require('moment-timezone');
const router = express.Router();
const ScheduledMessageService = require("../services/ScheduledMessageService");
const authenticateToken = require("../middlewares/authMiddleware"); // Importa el middleware

// router.post("/", authenticateToken, async (req, res) => {
//     const { message, groupId, scheduledDate, scheduledTime } = req.body;
//     const userId = req.user.id; // Asumiendo que el verifyToken coloca el userId en el req.userId
  
//     // Validación básica de los campos
//     if (!message || !groupId || !scheduledDate || !scheduledTime) {
//       return res.status(400).json({ message: "Todos los campos son obligatorios" });
//     }
  
//     try {
//       // Combina la fecha y hora en un solo valor para crear el mensaje programado
//       const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`); // Formato de fecha y hora
//       console.log("scheduledDateTime: " +scheduledDateTime)
  
//       // Crear el mensaje programado en la base de datos usando el servicio
//       const scheduledMessage = await ScheduledMessageService.create({
//         userId,
//         message,
//         groupId,
//         scheduledDate: scheduledDateTime,
//         status: "Pendiente", // El estado inicial del mensaje es "Pendiente"
//       });
  
//       // Devolver una respuesta exitosa con el mensaje programado
//       res.status(201).json({
//         message: "Mensaje programado correctamente",
//         scheduledMessage, // Devuelves el objeto creado
//       });
//     } catch (error) {
//       // Manejo de errores
//       console.error("Error programando el mensaje:", error);
//       res.status(500).json({ message: "Error interno del servidor", error: error.message });
//     }
//   });
  
  // Ruta para listar todos los mensajes programados

  router.post("/", authenticateToken, async (req, res) => {
    const { message, groupId, scheduledDate, scheduledTime } = req.body;
    const userId = req.user.id; // Asumiendo que el verifyToken coloca el userId en el req.userId
  
    // Validación básica de los campos
    if (!message || !groupId || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ message: "Todos los campos son obligatorios" });
    }
  
    try {
      // Combina la fecha y hora en un solo valor para crear el mensaje programado
    const [year, month, day] = scheduledDate.split('-'); // Suponiendo que la fecha está en formato YYYY-MM-DD
    const [hour, minute] = scheduledTime.split(':'); // Suponiendo que la hora está en formato HH:mm
    const scheduledFecha = `${year}-${month}-${day}`
    // Crear el objeto Date en UTC usando Date.UTC()
    const scheduledDateTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
    const scheduledHora = `${hour}${minute}00`;
  
      // Crear el mensaje programado en la base de datos usando el servicio
      const scheduledMessage = await ScheduledMessageService.create({
        userId,
        message,
        groupId,
        scheduledDate: scheduledDateTime, // Guardar la fecha en UTC y luego convertirla a Colombia
        status: "Pendiente", // El estado inicial del mensaje es "Pendiente"
        scheduledFecha,
        scheduledHora
      });
  
      // Devolver una respuesta exitosa con el mensaje programado
      res.status(201).json({
        message: "Mensaje programado correctamente",
        scheduledMessage, // Devuelves el objeto creado
      });
    } catch (error) {
      // Manejo de errores
      console.error("Error programando el mensaje:", error);
      res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
  });

//consulta de mensajes programados
router.get("/", authenticateToken, async (req, res) => {
    const userId = req.user.id; // Obtener el id del usuario desde el token
  
    try {
      // Obtener todos los mensajes programados del servicio
      const scheduledMessages = await ScheduledMessageService.getAllByUser(userId);
      // Devolver los mensajes programados
      res.status(200).json(scheduledMessages);
    } catch (error) {
      // Manejo de errores
      console.error("Error al listar los mensajes programados:", error);
      res.status(500).json({ message: "Error interno del servidor", error: error.message });
    }
  });


  // Editar un mensaje programado
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { message, groupId, scheduledDate, scheduledTime } = req.body;
  const userId = req.user.id;

  if (!message || !groupId || !scheduledDate || !scheduledTime) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  try {
    const [year, month, day] = scheduledDate.split("-");
    const [hour, minute] = scheduledTime.split(":");
    const scheduledDateTime = new Date(Date.UTC(year, month - 1, day, hour, minute));

    const updatedMessage = await ScheduledMessageService.updateById(id, userId, {
      message,
      groupId,
      scheduledDate: scheduledDateTime,
    });

    if (!updatedMessage) {
      return res.status(404).json({ message: "Mensaje programado no encontrado" });
    }

    res.status(200).json({
      message: "Mensaje programado actualizado correctamente",
      updatedMessage,
    });
  } catch (error) {
    console.error("Error al editar el mensaje programado:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

// Eliminar un mensaje programado
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const deletedMessage = await ScheduledMessageService.deleteById(id, userId);

    if (!deletedMessage) {
      return res.status(404).json({ message: "Mensaje programado no encontrado" });
    }

    res.status(200).json({
      message: "Mensaje programado eliminado correctamente",
    });
  } catch (error) {
    console.error("Error al eliminar el mensaje programado:", error);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
});

  module.exports = router;