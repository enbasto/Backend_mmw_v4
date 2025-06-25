//librerias e importaciones de sistema
const express = require("express");
const schedule = require("node-schedule");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
require("events").EventEmitter.defaultMaxListeners = 0;


//coneccion a la base de datos
const sequelize = require("./config/database");


//rutas de la aplicacion
const authRoutes = require("./routes/auth"); // Rutas de autenticación
const routerContactMessage = require("./routes/ContactMessage"); 
const gruposRoutes = require("./routes/grupos");
const messageRoutes = require("./routes/messageRoutes");
const reportMessagesRoutes = require("./routes/reportMessagesRouter");
const exportRoute = require("./routes/exportRoute");
const scheduleRoute = require("./routes/scheduleRoute");
const paymentRoute = require("./routes/paymentRoute");
const userRoutes = require("./routes/userRoute"); // Rutas de autenticación


//funciones
const {createLog}= require("./functions/log");
const {getOrCreateClient}= require("./functions/users");
const { sendGroupMessages, getMessage, getGroupMembers} = require("./functions/messages");


//middlewares
const logger = require("./middlewares/logger");

//models
require("./models/associations"); //  Importa el archivo de asociacio


//servicios de datos
const ScheduledMessageService = require("./services/ScheduledMessageService");



dotenv.config();

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
  .catch( async(err) => {
    await createLog(err);
  });



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

    //
    for (const scheduledMessage of scheduledMessages) {
      const { id, message, groupId, uuid } = scheduledMessage;

      try {
        if (!global.clients[uuid]) {
          const client = await getOrCreateClient(uuid);
          global.clients[uuid] = client;
        }

        if (!global.clients?.[uuid]?.info) {
          // El objeto o la propiedad no existe, realiza aquí las acciones necesarias
          await ScheduledMessageService.updateStatus(
            id,
            "Fallido",
            "No se Encontraron Credenciales de WhatsApp"
          );
          continue;
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
        await createLog(error);
        // Actualizar el estado del mensaje a "Fallido"
        await ScheduledMessageService.updateStatus(
          id,
          "Fallido",
          error.message
        );
      }
    }
  } catch (error) {
    await createLog(error);
  }
});

// Rutas de autenticación
app.use("/api/auth", authRoutes);
app.use("/api", routerContactMessage);
app.use("/api/grupos", gruposRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/report", reportMessagesRoutes);
app.use("/api/reporte/file", exportRoute);
app.use("/api/schedule-message", scheduleRoute);
app.use("/api/payments", paymentRoute);
app.use("/api", userRoutes)
// Rutas publica
app.use("/public", express.static("public"));

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
