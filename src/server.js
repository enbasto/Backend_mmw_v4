const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const express = require("express");
const logger = require("./middlewares/logger");
const schedule = require("node-schedule");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode"); // Librería para convertir el QR en base64
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const bodyParser = require("body-parser");
const sequelize = require("./config/database");
const authRoutes = require("./routes/auth"); // Rutas de autenticación
const User = require("./models/user"); // Modelo de usuario
const Number = require("./models/number");
const routerContactMessage = require("./routes/ContactMessage"); //
const routerNumbers = require("./routes/numbersRouter"); //
const gruposRoutes = require("./routes/grupos");
const messageRoutes = require("./routes/messageRoutes");
const reportMessagesRoutes = require("./routes/reportMessagesRouter");
const exportRoute = require("./routes/exportRoute");
const scheduleRoute = require("./routes/scheduleRoute");
const paymentRoute = require("./routes/paymentRoute");

const messageService = require("./services/messageService");
const reportMessageService = require("./services/reportMessageService");
const ScheduledMessageService = require("./services/ScheduledMessageService");

const Grupo = require("./models/Grupo");
const Miembro = require("./models/Miembro"); // Importa el modelo Miembro
require("./models/associations"); //  Importa el archivo de asociacio
dotenv.config();
const trace = require("stack-trace");
require("events").EventEmitter.defaultMaxListeners = 20;

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
  logger.info(`Método: ${req.method}, URL: ${req.url}`);
  next();
});

// Conexión a la base de datos
sequelize
  .authenticate()
  .then(() => {
    console.log("Conexión a la base de datos exitosa");
    return sequelize.sync();
  })
  .catch((err) => {
    const stackInfo = trace.parse(err)[0];
    logger.error(`
      Error al conectar con la base de datos: ${err.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${err.stack} 
      Error Completo: ${JSON.stringify(err, null, 2)}
    `);
  });

// Middleware para verificar el token JWT
function verifyToken(req, res, next) {
  const token = req.headers["authorization"].split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "No token provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido" });
    }

    req.userId = decoded.id;
    next();
  });
}

var clients = {}; // Almacenará las instancias de WhatsApp Web.js por usuario
var qrCodes = {}; // Almacena los códigos QR por usuario temporalmente

// funciones principales

// Verificar y ejecutar mensajes programados cada minuto
schedule.scheduleJob("* * * * *", async () => {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0"); // Meses empiezan en 0
  const day = String(now.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  // Obtener la hora en formato 'HHMMSS' (sin ':')
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const formattedTime = `${hours}${minutes}00`;

  try {
    const scheduledMessages = await ScheduledMessageService.getPendingMessages(
      formattedDate,
      formattedTime
    );
    console.log("scheduledMessages:")
    console.log(scheduledMessages)
    //
    for (const scheduledMessage of scheduledMessages) {
      const { id, message, groupId, uuid } = scheduledMessage;

      try {
        if (!clients[uuid]) {
          const client = await getOrCreateClient(uuid);
          clients[uuid] = client;
        }
        if (!clients?.[uuid]?.info?.me?._serialized) {
          // El objeto o la propiedad no existe, realiza aquí las acciones necesarias
          await ScheduledMessageService.updateStatus(
            id,
            "Fallido",
            "No se Encontraron Credenciales de WhatsApp"
          );
        }
        await ScheduledMessageService.updateStatus(id, "Enviando", "");

        // Obtener miembros del grupo
        const groupMembers = await getGroupMembers(groupId, uuid);

        const messageSend = await getMessage(message, uuid);

        // Enviar mensajes al grupo
        await sendGroupMessages(messageSend, groupMembers, uuid);

        // Actualizar el estado del mensaje a "Enviado"
        await ScheduledMessageService.updateStatus(id, "Enviado", "");
      } catch (error) {
        const stackInfo = trace.parse(error)[0];
        logger.error(`
          Error en el envío de mensaje programado: ${error.message}
          Línea: ${stackInfo.getLineNumber()} 
          Archivo: ${stackInfo.fileName} 
          Stack: ${error.stack} 
          Error Completo: ${JSON.stringify(error, null, 2)}
        `);
        // Actualizar el estado del mensaje a "Fallido"
        await ScheduledMessageService.updateStatus(
          id,
          "Fallido",
          error.message
        );
      }
    }
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error verificando mensajes programados: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
  }
});

// async function getMessage(selectedMessage, userId) {
//   return await messageService.getMessageByIdAndUuid(selectedMessage, userId);
// }

async function getMessage(selectedMessage, userId) {
  try {
    return await messageService.getMessageByIdAndUuid(selectedMessage, userId);
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en getMessage: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
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
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en getGroupMembers: ${error.message} 
      Línea: ${stackInfo.lineNumber} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    throw error;
  }
}

async function handleTestMessage(message, userId) {
  try {
    const nombre = clients[userId]?.info?.pushname || "";
    const personalizedMessage = message.message.replace(/@nombre/g, nombre);
    if (message.media) {
      await sendMediaMessage(
        message,
        personalizedMessage,
        userId,
        clients?.[userId]?.info?.me?._serialized
      );
    } else {
      await sendTextMessage(personalizedMessage, userId);
    }
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en handleTestMessage: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
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
      try {
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
          await sendTextMessage(personalizedMessage, userId, formattedNumber);
        }
      } catch (error) {
        statusDescripcion = error.message;
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
        cuenta_envio: clients[userId].info.me.user,
        statusDescripcion,
      });
    }
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en sendGroupMessages: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
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
    // const recipient = to || clients[userId].info.me._serialized;

    await clients[userId].sendMessage(destinatario, media, {
      caption: textMessage,
    });
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en sendMediaMessage: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    throw error;
  }
}

async function sendTextMessage(messageText, userId, to = null) {
  try {
    const recipient = to || clients[userId].info.me._serialized;
    await clients[userId].sendMessage(recipient, messageText);
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en sendTextMessage: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${error}
    `);
    throw error;
  }
}
const generateQRCode = (qr, userId) => {
  try {
    qrcode.toDataURL(qr, (err, url) => {
      if (err) {
        const stackInfo = trace.parse(err)[0];
        logger.error(`
          Error en generateQRCode: ${err.message} 
          Línea: ${stackInfo.getLineNumber()} 
          Archivo: ${stackInfo.fileName} 
          Stack: ${err.stack} 
          Error Completo: ${JSON.stringify(error, null, 2)}
        `);
      } else {
        qrCodes[userId] = url; // Almacena el QR generado en la estructura qrCodes
      }
    });
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en generateQRCode: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
  }
};

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
// Función para crear o recuperar un cliente para cada usuario
async function createClient(userId) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId }), // Cada usuario tendrá su propio almacenamiento de credenciales
    puppeteer: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      headless: true, // Modo sin interfaz gráfica para evitar errores de visualización
      // executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    },
  });

  // Manejar eventos
  client.on("qr", (qr) => {
    generateQRCode(qr, userId); // Llamar a la función para manejar la generación del QR
  });

  client.on("ready", () => {
    delete qrCodes[userId]; // Eliminar el QR una vez autenticado
  });

  client.on("authenticated", () => {
    if (qrCodes[userId]) {
      delete qrCodes[userId]; // Elimina el QR solo si existe
    }
  });

  client.on("disconnected", (reason) => {
    logger.info(`Cliente desconectado: ${userId} - ${reason}`);
    delete clients[userId]; // Remover el cliente cuando se desconecta
  });

  await client.initialize();
  return client;
}

async function getOrCreateClient(userId) {
  if (clients[userId]) {
    return clients[userId]; // Si ya existe, reutilizarlo
  }

  const client = await createClient(userId);
  clients[userId] = client;
  return client;
}

// Rutas de autenticación
app.use("/api/auth", authRoutes);
app.use("/api", routerContactMessage);
app.use("/api", routerNumbers);
app.use("/api/grupos", gruposRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/report", reportMessagesRoutes);
app.use("/api/reporte/file", exportRoute);
app.use("/api/schedule-message", scheduleRoute);
app.use("/api/payments", paymentRoute);
// Rutas publica
app.use("/public", express.static("public"));

// Endpoint para iniciar sesión de WhatsApp (con autenticación JWT)
var countCliente = 0;
app.post("/api/start-session", verifyToken, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.userId;
    countCliente++;
    if (clients[userId]) {
      return res
        .status(200)
        .json({ message: "Te Damos la Bienvenida", userId });
    }

    // const client = await getOrCreateClient(userId);
    const client = await createClient(userId);
    clients[userId] = client;

    res
      .status(200)
      .json({ message: `Sesión iniciada para el usuario ${userId}` });
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en start-session: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Endpoint para obtener el QR de un usuario (con autenticación JWT)
app.get("/api/get-qr/", verifyToken, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.userId;
    if (!clients[userId]) {

      // Now remove the userDataDir itself
      try {
        let userDataDir = path.join(
          process.cwd(),
          ".wwebjs_auth",
          `session-${userId}`
        );
        await fs.promises.rm(userDataDir, {
          recursive: true,
          force: true,
        });
      } catch (error) {
        const stackInfo = trace.parse(error)[0];
        logger.error(`
          Error en userDataDir: ${error.message} 
          Línea: ${stackInfo.getLineNumber()} 
          Archivo: ${stackInfo.fileName} 
          Stack: ${error.stack} 
          Error Completo: ${JSON.stringify(error, null, 2)}
        `);
      }
      const client = await createClient(userId);
      clients[userId] = client;
      // return res
      //   .status(404)
      //   .json({ message: "Sesión no encontrada para este usuario" });
    }

    if (
      clients[userId] &&
      clients[userId].info &&
      clients[userId].info.me &&
      clients[userId].info.me.user
    ) {
      return res.status(200).json({ qr: "", client: clients[userId].info.me });
    }
    const qrCode = qrCodes[userId];
    if (qrCode) {
      res.status(200).json({ qr: qrCode });
    } else {
      res.status(404).json({ message: "QR no disponible o ya autenticado" });
    }
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en get-qr: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

app.post("/api/send-message", verifyToken, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { selectedMessage, selectedGroup, isPrueba } = req.body;
    const userId = req.userId;
    if (!clients[userId]) {
      return res.status(404).json({
        status: "Error",
        message: "No tiene ninguna cuenta de WhatsApp vinculada",
      });
    }

    const message = await getMessage(selectedMessage, userId);
    if (!message)
      return res.status(404).json({ message: "Mensaje no encontrado" });

    const groupMembers = await getGroupMembers(selectedGroup, userId);
    if (!groupMembers)
      return res.status(404).json({ message: "Grupo no encontrado" });

    if (isPrueba) {
      await handleTestMessage(message, userId);
      return res
        .status(200)
        .json({ message: "Mensaje de prueba en proceso de envío" });
    }

    // Respuesta enviada al cliente antes de procesar el envío de mensajes
    res.status(200).json({ message: "Mensajes en proceso de envío" });

    // Ejecutar `sendGroupMessages` en segundo plano
    // setImmediate(async () => {
    //   try {
    //     await sendGroupMessages(message, groupMembers, userId);
    //   } catch (error) {
    //     console.error("Error enviando mensajes:", error);
    //   }
    // });

    setTimeout(async () => {
      try {
        await sendGroupMessages(message, groupMembers, userId);
      } catch (error) {
        const stackInfo = trace.parse(error)[0];
        logger.error(`
      Error en setTimeout: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
      }
    }, 100); // Retraso de 100ms para evitar bloqueos en el event loop
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en send-message: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    res
      .status(500)
      .json({ status: "Fallo en el procesamiento de los mensajes", error });
  }
});

// Endpoint para cerrar sesión (con autenticación JWT)
app.post("/api/close-session", verifyToken, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.userId;

    if (clients[userId]) {
      const sessionPath = clients[userId].authStrategy.userDataDir;
      // await clients[userId].logout();

      await clients[userId].destroy(); // Cierra la sesión del cliente

      delete clients[userId]; // Elimina la instancia del cliente

      try {
        // if (fs.existsSync(sessionPath)) {
        //   fs.rmSync(sessionPath, { recursive: true, force: true });
        // }

        const dirExists = await fs.promises
          .access(sessionPath)
          .then(() => true)
          .catch(() => false);

        if (dirExists) {
          const dirContents = await fs.promises.readdir(sessionPath);

          if (dirContents.length > 0) {
            // Delete all files and subdirectories inside userDataDir
            await Promise.all(
              dirContents.map((file) =>
                fs.promises.rm(path.join(sessionPath, file), {
                  recursive: true,
                  force: true,
                })
              )
            );
          }

          // Now remove the userDataDir itself
          await fs.promises.rm(sessionPath, {
            recursive: true,
            force: true,
          });
        }
      } catch (error) {
        const stackInfo = trace.parse(error)[0];
        logger.error(`
      Error en sessionPath: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
      }

      return res.status(200).json({
        message: `Sesión cerrada correctamente para el usuario ${userId}`,
      });
    }

    res.status(404).json({ message: "Sesión no encontrada" });
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en close-session: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    res.status(500).json({ message: "Error cerrando sesión", error });
  }
});

app.post("/api/contactsWhatsApp", verifyToken, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.userId;

    if (!clients[userId]) {
      return res.status(404).json({
        status: "Error",
        message: "No tiene ninguna cuenta de WhatsApp vinculada",
      });
    }

    const numbers = await clients[userId].getContacts();
    // Si no se encuentra al usuario
    if (!numbers) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const filteredNumbers = [];

    numbers.forEach((contact) => {
      // Ignorar contactos con `id.server` igual a "lid"
      if (contact.id.server === "lid") {
        return;
      }

      filteredNumbers.push({
        name: contact.name || contact.pushname || "Sin nombre", // Valor por defecto
        number: contact.number,
      });
    });
    res.status(200).json({ data: filteredNumbers });
  } catch (error) {
    const stackInfo = trace.parse(error)[0];
    logger.error(`
      Error en contactsWhatsApp: ${error.message} 
      Línea: ${stackInfo.getLineNumber()} 
      Archivo: ${stackInfo.fileName} 
      Stack: ${error.stack} 
      Error Completo: ${JSON.stringify(error, null, 2)}
    `);
    res.status(500).json({ message: error.message });
  }
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
