
const { Op } = require("sequelize"); // Asegúrate de importar Op
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode"); // Librería para convertir el QR en base64


const userService = require("../services/userService.js");
const Payment = require("../models/payments"); // Modelo Payment
const logger = require("../middlewares/logger");
const {createLog} = require("./log")

require("dotenv").config();

const amountSendFree = Number(process.env.CANTIDAD_ENVIOS_PRUEBA || 30);
global.qrCodes = {}; // Almacena los códigos QR por usuario temporalmente
global.clients = {};

const canSendMessages = async (userId) => {
  const user = await userService.getUserById(userId);
  if (!user) throw new Error("Usuario no encontrado");

  const currentDate = new Date();

  const payment = await Payment.findOne({
    where: {
      uuid: userId,
      payment_status: "APPROVED",
      due_date: {
        [Op.gte]: currentDate,
      },
    },
  });

  if (payment) {
    return true;
  }

  const enPeriodoPrueba =
    user.free_trial_end && new Date(user.free_trial_end) > currentDate;

  if (!enPeriodoPrueba || user.messages_sent >= amountSendFree) {
    return false;
  }

  return true;
};

const incrementSendMessages = async (userId, cantidad) => {
  const responseUpdate = await userService.incrementMessagesSent(
    userId,
    cantidad
  );
  if (!responseUpdate) {
    throw new Error("Usuario no encontrado");
  }
  return true;
};

async function createClient(userId) {
  const client = new Client({
    authStrategy: new LocalAuth({ 
      clientId: userId, 
      // dataPath: "" //ruta para credenciales
    }), // Cada usuario tendrá su propio almacenamiento de credenciales
    puppeteer: {
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      headless: true, // Modo sin interfaz gráfica para evitar errores de
      executablePath: process.env.EXECUTABLEPATH || "" // ruta para el programa de crhome
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
    if (global.qrCodes[userId]) {
      delete global.qrCodes[userId]; // Elimina el QR solo si existe
    }
  });

  client.on("disconnected", (reason) => {
    logger.info(`Cliente desconectado: ${userId} - ${reason}`);
    // Elimina todos los listeners del cliente
    client.removeAllListeners();

    delete global.clients[userId]; // Remover el cliente cuando se desconecta
  });

  await client.initialize();
  return client;
}

async function getOrCreateClient(userId) {
  if (global.clients[userId]) {
    return global.clients[userId]; // Si ya existe, reutilizarlo
  }

  const client = await createClient(userId);
  global.clients[userId] = client;
  return client;
}

const generateQRCode = async (qr, userId) => {
  try {
    qrcode.toDataURL(qr, async (err, url) => {
      if (err) {
        await createLog(err);
      } else {
        global.qrCodes[userId] = url; // Almacena el QR generado en la estructura qrCodes
      }
    });
  } catch (error) {
    await createLog(error);
  }
};
module.exports = {
  canSendMessages,
  incrementSendMessages,
  createClient,
  getOrCreateClient
};
