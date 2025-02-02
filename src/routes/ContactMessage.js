const express = require("express");
const ContactMessage = require("../models/ContactMessage"); // El modelo ContactMessage que creaste
const routerContactMessage = express.Router();

// Ruta para recibir los datos del formulario y almacenarlos en la base de datos
routerContactMessage.post("/contact-message", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Verificar si los campos están presentes y no vacíos
    if (!name?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!email?.trim()) {
      return res
        .status(400)
        .json({ error: "El correo electrónico es obligatorio" });
    }

    if (!message?.trim()) {
      return res.status(400).json({ error: "El mensaje es obligatorio" });
    }

    // Verificar el formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "El formato del correo electrónico no es válido" });
    }

    // Crear el mensaje de contacto en la base de datos
    const newMessage = await ContactMessage.create({
      name,
      email,
      message,
    });

    // Devolver una respuesta de éxito
    res.status(201).json({
      message: "Mensaje enviado con éxito",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error al guardar el mensaje:", error);
    res
      .status(500)
      .json({ error: "Error al guardar el mensaje en la base de datos" });
  }
});

module.exports = routerContactMessage;
