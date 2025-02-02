const schedule = require("node-schedule");
const ScheduledMessageService = require("../services/ScheduledMessageService");

// Verificar y ejecutar mensajes programados cada minuto
schedule.scheduleJob("* * * * *", async () => {
  console.log("Verificando mensajes programados...");
  const now = new Date();

  try {
    // Obtener mensajes pendientes cuyo tiempo ha llegado
    const scheduledMessages = await ScheduledMessageService.getPendingMessages(now);

    for (const scheduledMessage of scheduledMessages) {
      const { id, message, groupId, userId } = scheduledMessage;

      try {
        // Obtener miembros del grupo
        const groupMembers = await getGroupMembers(groupId, userId);

        // Enviar mensajes al grupo
        await sendGroupMessages({ message }, groupMembers, userId);

        // Actualizar el estado del mensaje a "Enviado"
        await ScheduledMessageService.updateStatus(id, "Enviado");

        console.log(`Mensaje con ID ${id} enviado correctamente.`);
      } catch (error) {
        console.error(`Error enviando mensaje con ID ${id}:`, error);

        // Actualizar el estado del mensaje a "Fallido"
        await ScheduledMessageService.updateStatus(id, "Fallido");
      }
    }
  } catch (error) {
    console.error("Error verificando mensajes programados:", error);
  }
});
