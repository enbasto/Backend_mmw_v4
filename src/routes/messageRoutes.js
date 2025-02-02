const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const messageService = require("../services/messageService");
const authenticateToken = require("../middlewares/authMiddleware"); // Importa el middleware

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Construir la ruta del directorio dinámico basado en req.user.id
    const userDir = `public/files/${req.user.id}`;

    // Verificar si el directorio existe, si no, crearlo
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true }); // Crear el directorio (incluyendo subdirectorios si es necesario)
    }

    cb(null, userDir); // Asignar el directorio de destino
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Nombre único del archivo
  },
});

const upload = multer({ storage });

// Obtener todos los mensajes
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await messageService.getAllMessages(userId);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error al obtener los mensajes" });
  }
});

// // Crear un nuevo mensaje
// router.post("/", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { abreviacion, message, intervaloMessage, urlMedia, media } =
//       req.body;
//     const newMessage = await messageService.createMessage({
//       abreviacion,
//       message,
//       intervaloMessage,
//       urlMedia,
//       media,
//       uuid: userId,
//     });
//     res.json(newMessage);
//   } catch (error) {
//     res.status(500).json({ error: "Error al crear el mensaje" });
//   }
// });

// Crear un nuevo mensaje
router.post("/", authenticateToken, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { abreviacion, message, intervaloMessage } = req.body;
    // Verificar si se subió un archivo
    const urlMedia = req.file ? `${req.protocol}://${req.get("host")}/${req.file.path}` : null;
    const media = !!urlMedia; // Será `true` si `urlMedia` tiene contenido

    const newMessage = await messageService.createMessage({
      abreviacion,
      message,
      intervaloMessage,
      urlMedia,
      media,
      uuid: userId,
    });
    console.log(newMessage);
    res.json(newMessage);
  } catch (error) {
    console.error("Error al crear el mensaje:", error);
    res.status(500).json({ error: "Error al crear el mensaje" });
  }
});


// Editar un mensaje existente
router.put("/:id", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      const userId = req.user.id;
      const messageId = req.params.id;
      const { abreviacion, message, intervaloMessage } = req.body;
  
      // Buscar el mensaje por ID y validar que el `uuid` coincida con `userId`
      const existingMessage = await messageService.getMessageByIdAndUuid(messageId, userId);
  
      if (!existingMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado o no autorizado" });
      }
  
      // Eliminar el archivo antiguo si existe
      if (existingMessage.urlMedia) {
        const filePath = existingMessage.urlMedia.replace(`${req.protocol}://${req.get("host")}/`, "");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Elimina el archivo
        }
      }
  
      // Procesar el nuevo archivo (si se subió)
      const newUrlMedia = req.file ? `${req.protocol}://${req.get("host")}/${req.file.path}` : "";
      const media = !!newUrlMedia; // Será `true` si hay una nueva URL de media
  
      // Actualizar el mensaje
      const updatedMessage = await messageService.updateMessage(messageId, {
        abreviacion,
        message,
        intervaloMessage,
        urlMedia: newUrlMedia,
        media,
      });
  
      res.json({
        abreviacion,
        message,
        intervaloMessage,
        urlMedia: newUrlMedia,
        media,
      });
    } catch (error) {
      console.error("Error al editar el mensaje:", error);
      res.status(500).json({ error: "Error al editar el mensaje" });
    }
  });
  

// Eliminar un mensaje
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingMessage = await messageService.getMessageByIdAndUuid(id, userId);
  
      if (!existingMessage) {
        return res.status(404).json({ error: "Mensaje no encontrado o no autorizado" });
      }
  
      // Eliminar el archivo antiguo si existe
      if (existingMessage.urlMedia) {
        const filePath = existingMessage.urlMedia.replace(`${req.protocol}://${req.get("host")}/`, "");
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); // Elimina el archivo
        }
      }
    await messageService.deleteMessage(id, userId);
    res.json({ message: "Mensaje eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar el mensaje" });
  }
});

module.exports = router;
