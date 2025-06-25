const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();


//middleware
const authMiddleware = require("../middlewares/authMiddleware");

//funciones
const { createClient } = require("../functions/users");
const { createLog } = require("../functions/log");
const { sendGroupMessages, getMessage, getGroupMembers, handleTestMessage} = require("../functions/messages");
const {canSendMessages}= require("../functions/users");


global.countCliente = 0;

router.post("/close-session", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.user.id;

    if (global.clients[userId]?.info) {
      const sessionPath = global.clients[userId].authStrategy.userDataDir;
      // await clients[userId].logout();

      await global.clients[userId].destroy(); // Cierra la sesión del cliente

      delete global.clients[userId]; // Elimina la instancia del cliente

      try {
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
        await createLog(error);
      }

      return res.status(200).json({
        message: `Sesión cerrada correctamente para el usuario ${userId}`,
      });
    }

    res.status(404).json({ message: "Sesión no encontrada" });
  } catch (error) {
    await createLog(error);
    res.status(500).json({ message: "Error cerrando sesión", error });
  }
});

//crea la sesion de conccion con whatsapp para cada usuario
router.post("/start-session", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.user.id;
    global.countCliente++;
    if (global.clients[userId]) {
      return res
        .status(200)
        .json({ message: "Te Damos la Bienvenida", userId });
    }

    // const client = await getOrCreateClient(userId);
    const client = await createClient(userId);
    global.clients[userId] = client;

    res
      .status(200)
      .json({ message: `Sesión iniciada para el usuario ${userId}` });
  } catch (error) {
    await createLog(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Endpoint para obtener el QR de un usuario (con autenticación JWT)
router.get("/get-qr/", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.user.id;
    if (!global.clients[userId]) {
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
        await createLog(error);
      }
      const client = await createClient(userId);
      global.clients[userId] = client;
    }

    if (
      global.clients[userId] &&
      global.clients[userId].info &&
      global.clients[userId].info.me &&
      global.clients[userId].info.me.user
    ) {
      return res
        .status(200)
        .json({ qr: "", client: global.clients[userId].info.me });
    }
    const qrCode = global.qrCodes[userId];
    if (qrCode) {
      res.status(200).json({ qr: qrCode });
    } else {
      res.status(404).json({ message: "QR no disponible o ya autenticado" });
    }
  } catch (error) {
    await createLog(error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

//envia los mensajes para cada usuario
router.post("/send-message", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const { selectedMessage, selectedGroup, isPrueba } = req.body;
    const userId = req.user.id;

    if (!global.clients[userId]?.info) {
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

    const validFree = await canSendMessages(userId);
    if (!validFree) {
      return res
        .status(404)
        .json({ message: "Lo sentimos tú periodo de prueba ya termino." });
    }
    // Respuesta enviada al cliente antes de procesar el envío de mensajes
    res.status(200).json({ message: "Mensajes en proceso de envío" });

    setTimeout(async () => {
      try {
        await sendGroupMessages(message, groupMembers, userId);
      } catch (error) {
        await createLog(error);
      }
    }, 100); // Retraso de 100ms para evitar bloqueos en el event loop
  } catch (error) {
    await createLog(error);
    res.status(500).json({ message: "Desconectaste la sesion de whatsapp o un error ocurrio" });
  }
});

router.post("/contactsWhatsApp", authMiddleware, async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const userId = req.user.id;

    if (!global.clients[userId]?.info) {
      return res.status(404).json({
        status: "Error",
        message: "No tiene ninguna cuenta de WhatsApp vinculada",
      });
    }

    const numbers = await global.clients[userId].getContacts();
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
    await createLog(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
