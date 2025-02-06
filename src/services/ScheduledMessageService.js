// services/ScheduledMessageService.js

const ScheduledMessage = require("../models/ScheduledMessage");
const Grupo = require("../models/Grupo");
const Message = require("../models/Messages");
const { Op } = require("sequelize"); // Asegúrate de importar Op

class ScheduledMessageService {
  static async create({ userId, message, groupId, scheduledDate, status, scheduledFecha, scheduledHora }) {
    try {
      // Crear un mensaje programado usando Sequelize
      const scheduledMessage = await ScheduledMessage.create({
        uuid: userId, // O generar un UUID único si es necesario
        message,
        groupId,
        scheduledDate,
        status,
        scheduledFecha,
        scheduledHora
      });
      return scheduledMessage;
    } catch (error) {
      throw new Error("Error al crear el mensaje programado: " + error.message);
    }
  }

  // static async getPendingMessages(now) {
  //   try {
  //     // Obtener los mensajes pendientes cuya fecha sea anterior o igual a la fecha actual
  //     const scheduledMessages = await ScheduledMessage.findAll({
  //       where: {
  //         status: "Pendiente",
  //         // scheduledDate: { [Op.lte]: now }, /
  //         scheduledDate: { [Op.lte]: now }, // Usando Sequelize's operadores para comparar fechas
  //       },
  //     });
  //     return scheduledMessages;
  //   } catch (error) {
  //     throw new Error(
  //       "Error al obtener los mensajes pendientes: " + error.message
  //     );
  //   }
  // }

  static async getPendingMessages(scheduledFecha,scheduledHora) {
    try {
      // Obtener los mensajes pendientes cuya fecha sea anterior o igual a la fecha actual
      const scheduledMessages = await ScheduledMessage.findAll({
        where: {
          status: "Pendiente",
          scheduledFecha: scheduledFecha, 
          scheduledHora: { [Op.lte]: scheduledHora },
        },
      });
      return scheduledMessages;
    } catch (error) {
      throw new Error(
        "Error al obtener los mensajes pendientes: " + error.message
      );
    }
  }
  static async updateStatus(id, status, statusDescripcion) {
    try {
      // Actualizar el estado del mensaje programado
      const [updated] = await ScheduledMessage.update(
        { status, statusDescripcion },
        { where: { id } }
      );
      return updated;
    } catch (error) {
      throw new Error("Error al actualizar el estado: " + error.message);
    }
  }

  static async getByUser(userId) {
    try {
      // Obtener los mensajes programados por un usuario específico
      const scheduledMessages = await ScheduledMessage.findAll({
        where: { uuid: userId },
      });
      return scheduledMessages;
    } catch (error) {
      throw new Error(
        "Error al obtener los mensajes por usuario: " + error.message
      );
    }
  }

  ////////////////////////////////////////////////////////////////
  static async getAllByUser(userId) {
    try {
      const scheduledMessages = await ScheduledMessage.findAll({
        where: { uuid: userId },
        include: [
          {
            model: Message, // Asegúrate de haber importado este modelo
            as: "msg", // Este alias debe coincidir con el definido en la relación
            // attributes: ["abreviacion"], // Solo trae el campo 'message' de Message
          },
          {
            model: Grupo, // Asegúrate de haber importado este modelo
            as: "gru", // Este alias debe coincidir con el definido en la relación
            attributes: ["nombre"], // Solo trae el campo 'nombre' de Grupo
          },
        ],
      });

      // Modificar la estructura de los datos para que coincida con lo que necesitas
      const result = scheduledMessages.map((msg) => {
        // Convierte `scheduledDate` a una cadena ISO si es un objeto Date
        const fechaHoraISO =
          msg.scheduledDate instanceof Date
            ? msg.scheduledDate.toISOString() 
            : typeof msg.scheduledDate === "string"
            ? msg.scheduledDate // Si ya es una cadena, úsala directamente
            : null;

        if (!fechaHoraISO) {
          console.error("scheduledDate no es válido:", msg.scheduledDate);
          return null; // Ignora mensajes con fechas no válidas
        }

        const [fecha, horaCompleta] = fechaHoraISO.split("T");
        const hora = horaCompleta
          ? horaCompleta.split(":").slice(0, 2).join(":")
          : null; // "HH:mm"

        return {
          id: msg.id,
          status: msg.status,
          statusDescripcion: msg.statusDescripcion,
          message: msg.msg ? msg.msg : null, // Verifica si 'msg' existe
          grupo: msg.gru ? msg.gru.nombre : null, // Verifica si 'gru' existe
          fecha: fecha, // Fecha "YYYY-MM-DD"
          hora: hora, // Hora "HH:mm"
        };
      });
      return result;
    } catch (error) {
      throw new Error(
        "Error al obtener los mensajes por usuario: " + error.message
      );
    }
  }
  // Actualizar un mensaje por ID
  static async updateById(id, userId, data) {
    const message = await ScheduledMessage.findOne({ where: { id:id, uuid:userId } });
    if (!message) return null;
    return await message.update(data);
  }

  // Eliminar un mensaje por ID
  static async deleteById(id, userId) {
    const message = await ScheduledMessage.findOne({ where: { id, uuid:userId } });
    if (!message) return null;
    await message.destroy();
    return true;
  }
}

module.exports = ScheduledMessageService;
