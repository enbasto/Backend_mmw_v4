const Message = require('../models/Messages');

// Obtener todos los mensajes
const getAllMessages = async (userId) => {
  return await Message.findAll({where: { uuid: userId }});
};

// Crear un nuevo mensaje
const createMessage = async (data) => {
  return await Message.create(data);
};

// Actualizar un mensaje existente
const updateMessage = async (id, data) => {
  return await Message.update(data, { where: { id } });
};

// Eliminar un mensaje
const deleteMessage = async (id, userId) => {
  return await Message.destroy({ where: { id, uuid: userId  } });
};

async function getMessageByIdAndUuid(messageId, userId) {
  return await Message.findOne({ where: { id: messageId, uuid: userId } });
}


module.exports = {
  getAllMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getMessageByIdAndUuid,
};
