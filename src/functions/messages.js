const fs = require("fs");
const path = require("path");
const { MessageMedia } = require("whatsapp-web.js");

const {createLog} = require("./log")
const messageService = require("../services/messageService");
const reportMessageService = require("../services/reportMessageService");
const { canSendMessages, incrementSendMessages } = require("./users");
//models
const Grupo = require("../models/Grupo");
const Miembro = require("../models/Miembro"); // Importa el modelo Miembro
require("../models/associations"); //  Importa el archivo de asociacio

/**
 * Función para obtener el tipo MIME según la extensión del archivo.
 * @param {string} filePath - Ruta del archivo.
 * @returns {string} Tipo MIME.
 */
async function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".csv": "text/csv",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".aac": "audio/aac",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".zip": "application/zip",
    // Puedes agregar más extensiones según sea necesario
  };

  return mimeTypes[extension] || "application/octet-stream"; // Valor predeterminado para tipos desconocidos
}

async function getMessage(selectedMessage, userId) {
  try {
    return await messageService.getMessageByIdAndUuid(selectedMessage, userId);
  } catch (error) {
    await createLog(error);
    
    throw error;
  }
}

async function getGroupMembers(selectedGroup, userId) {
  try {
    const group = await Grupo.findOne({
      where: { id: selectedGroup, uuid: userId },
      include: [
        {
          model: Miembro,
          as: "miembros",
          attributes: ["id", "nombre", "telefono"],
        },
      ],
    });
    return group ? group : null;
  } catch (error) {
    await createLog(error);
    throw error;
  }
}

async function handleTestMessage(message, userId) {
  try {
    const nombre = global.clients[userId]?.info?.pushname || "";
    const personalizedMessage = message.message.replace(/@nombre/g, nombre);
    if (message.media) {
      await sendMediaMessage(
        message,
        personalizedMessage,
        userId,
        global.clients[userId]?.info?.me?._serialized
      );
    } else {
      await sendTextMessage(personalizedMessage, userId);
    }
  } catch (error) {
    await createLog(error);
    throw error;
  }
}

async function sendGroupMessages(message, group, userId) {
  try {
    const groupMembers = group.miembros; // Extraer los miembros
    for (const member of groupMembers) {
      const formattedNumber = `${member.telefono}@c.us`;
      const intervaloTime =
        (message.intervaloMessage ? message.intervaloMessage : 3) * 1000;
      await new Promise((resolve) => setTimeout(resolve, intervaloTime));

      // Crear una copia del mensaje original y personalizarlo
      const personalizedMessage = message.message.replace(
        /@nombre/g,
        member.nombre
      );

      let estadoEnvio = "Enviado";
      let statusDescripcion = "";
      const puedeEnviar = await canSendMessages(userId);

      try {
        if (puedeEnviar) {
          if (global.clients[userId]?.info) {
            if (message.media) {
              // Enviar mensaje multimedia
              await sendMediaMessage(
                message,
                personalizedMessage,
                userId,
                formattedNumber
              );
            } else {
              // Enviar mensaje de texto
              await sendTextMessage(
                personalizedMessage,
                userId,
                formattedNumber
              );
            }
            await incrementSendMessages(userId, 1);
          } else {
            statusDescripcion = "WhatsApp desvinculado";
            estadoEnvio = "No Enviado";
          }
        } else {
          statusDescripcion =
            "Ha alcanzado el límite de mensajes en el periodo de prueba.";
          estadoEnvio = "No Enviado";
        }
      } catch (error) {
        statusDescripcion = error.message.slice(0, 200);
        estadoEnvio = "No Enviado";
      }

      await reportMessageService.createReportMessage({
        numero_cel: member.telefono,
        message: message.message,
        urlMedia: message.urlMedia,
        estadoEnvio: estadoEnvio,
        uuid: userId,
        nombre_contacto: member.nombre,
        grupo: group.nombre,
        cuenta_envio: global.clients?.[userId]?.info?.me?.user ?? "",
        statusDescripcion,
      });

      if (!puedeEnviar) {
        break;
      }
    }
  } catch (error) {
    await createLog(error);
    throw error;
  }
}

async function sendMediaMessage(
  message,
  textMessage,
  userId,
  destinatario = null
) {
  try {
    const name = message.urlMedia?.split(/[\\/]/).pop();
    const filePath = path.join(process.cwd(), "public", "files", userId, name);
    if (!fs.existsSync(filePath)) {
      throw new Error(`El archivo no existe: ${filePath}`);
    }

    // const fileData = fs.readFileSync(filePath);
    // const base64Data = fileData.toString("base64");
    // const mimeType = getMimeType(filePath);

    // const media = new MessageMedia(
    //   mimeType,
    //   base64Data,
    //   path.basename(filePath)
    // );

    const media = MessageMedia.fromFilePath(filePath);

    await global.clients[userId].sendMessage(destinatario, media, {
      caption: textMessage,
    });
  } catch (error) {
    await createLog(error);
    throw error;
  }
}

async function sendTextMessage(messageText, userId, to = null) {
  try {
    const recipient = to || global.clients[userId]?.info?.me?._serialized;
    await global.clients[userId].sendMessage(recipient, messageText);
  } catch (error) {
    await createLog(error);
    throw error;
  }
}

module.exports = {
  getMimeType,
  getMessage,
  getGroupMembers,
  handleTestMessage,
  sendGroupMessages,
  sendMediaMessage,
  sendTextMessage
};
