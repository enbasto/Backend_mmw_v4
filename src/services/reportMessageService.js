const ReportMessage = require('../models/ReportMessage');

const createReportMessage = async (data) => {
  try {
    const newMessage = await ReportMessage.create({
      numero_cel: data.numero_cel,
      message: data.message,
      urlMedia: data.urlMedia || null, // Permite que sea null
      estadoEnvio: data.estadoEnvio,
      uuid: data.uuid,
      nombre_contacto: data.nombre_contacto || null, // Permite que sea null
      grupo: data.grupo || null, // Permite que sea null
      cuenta_envio: data.cuenta_envio
    });
    return newMessage;
  } catch (error) {
    throw new Error('Error al crear el mensaje: ' + error.message);
  }
};

const getReportMessages = async (userId) => {
  try {
    const messages = await ReportMessage.findAll({where: { uuid: userId }});
    return messages;
  } catch (error) {
    throw new Error('Error al obtener los mensajes: ' + error.message);
  }
};

// funcion elimina el mensaje que pertenece al usuario
const deleteReportMessages = async (id, userId) => {
  return await ReportMessage.destroy({ where: { id, uuid: userId  } });
};
// Función para eliminar mensajes por userId
const deleteAllReportMessages = async (userId) => {
  try {
    const deletedCount = await ReportMessage.destroy({ where: { uuid: userId } });
    return deletedCount; // Devuelve el número de registros eliminados
  } catch (error) {
    throw new Error('Error al eliminar los mensajes: ' + error.message);
  }
};



module.exports = {
  createReportMessage,
  getReportMessages,
  deleteReportMessages,
  deleteAllReportMessages,
};
