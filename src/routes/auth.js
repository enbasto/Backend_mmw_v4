const express = require("express");
const fs = require("fs");
const bcrypt = require("bcrypt");
const User = require("../models/user"); // El modelo User que creaste arriba
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const router = express.Router();
const Payment = require("../models/payments");
const { Op } = require("sequelize"); // Asegúrate de importar Op
const { sendEmail } = require("../services/emailService");
const authMiddleware = require("../middlewares/authMiddleware");

dotenv.config();
// Endpoint para crear un nuevo usuario
router.post("/registerUser", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const { nombres, apellidos, email, password, fecha_nacimiento, genero, numero_celular } =
    req.body;

  // Validación de campos
  const validationErrors = [];

  if (!nombres || typeof nombres !== "string") {
    validationErrors.push('El campo "nombres" es obligatorio.');
  }

  if (!apellidos || typeof apellidos !== "string") {
    validationErrors.push('El campo "apellidos" es obligatorio.');
  }

  if (!email || typeof email !== "string") {
    validationErrors.push('El campo "email" es obligatorio.');
  }

  if (!password || typeof password !== "string") {
    validationErrors.push('El campo "password" es obligatorio.');
  }

  if (!fecha_nacimiento || !Date.parse(fecha_nacimiento)) {
    validationErrors.push('El campo "fecha nacimiento" es obligatorio.');
  }

  const validGeneros = ["masculino", "femenino", "otro"];
  if (!genero || !validGeneros.includes(genero)) {
    validationErrors.push('El campo "genero" es obligatorio.');
  }

  // Si hay errores de validación, devolverlos
  if (validationErrors.length > 0) {
    return res
      .status(400)
      .json({
        message: "Errores de validación",
        errors: validationErrors,
        status: false,
      });
  }

  try {
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "El usuario ya existe", errors: [], status: false });
    }

    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const now = new Date();
    const freeTrialEnd = new Date();
    freeTrialEnd.setDate(now.getDate() + 3); // Sumar 3 días para la prueba gratuita
    // Crear un nuevo usuario
    const newUser = await User.create({
      nombres,
      apellidos,
      email,
      hashed_password: hashedPassword,
      salt,
      fecha_nacimiento, // Asegúrate de guardar este campo
      genero, // Asegúrate de guardar este campo
      numero_celular,
      free_trial_end: freeTrialEnd,
    });

    // Construye la URL de verificación (ajusta según tu lógica)
    const token = Buffer.from(newUser.dataValues.email).toString("base64");

    const contenidoPlantilla = fs.readFileSync(
      process.cwd() + process.env.CONFIRM_EMAIL_USER,
      "utf8"
    );
    const dataEnvioEmail = JSON.parse(contenidoPlantilla);

    const contenidoHTML = fs.readFileSync(
      process.cwd() + dataEnvioEmail.html,
      "utf8"
    );
    parametros = dataEnvioEmail.Parametros;

    var contenidoHTMLModificado = contenidoHTML;
    for (let key in parametros) {
      const valueParametros = parametros[key] + token;
      contenidoHTMLModificado = contenidoHTMLModificado.replace(
        key,
        valueParametros
      );
    }
    await sendEmail(
      newUser.dataValues.email,
      dataEnvioEmail.Asunto,
      null,
      contenidoHTMLModificado
    );

    // Responder con el usuario creado y el token
    res
      .status(201)
      .json({
        message:
          "Usuario creado exitosamente, Ingresa a Tú correo y verifica la cuenta",
        errors: [],
        user: newUser.dataValues,
        status: true,
      });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res
      .status(500)
      .json({ message: "Error en el servidor", errors: [], status: false });
  }
});


router.post("/login", async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  const { email, password } = req.body;

  try {
    // Buscar al usuario por email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Usurio no Registrado." });
    }

    if (!user.verificacion_email) {
      return res.status(403).json({ message: "Debe verificar su cuenta, Revise su correo" });
    }

    // Verificar la contraseña usando bcrypt
    const validPassword = await bcrypt.compare(password, user.hashed_password);

    if (!validPassword) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const currentDate = new Date();

    // Validar el periodo de prueba
    if (user.free_trial_end && currentDate <= new Date(user.free_trial_end)) {
      // El usuario está dentro del periodo de prueba
      const token = jwt.sign({ id: user.uuid }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });

      return res.status(200).json({
        message: "Inicio de sesión exitoso (Periodo de prueba)",
        token,
        user: {
          name: `${user.nombres} ${user.apellidos}`,
          email: user.email,
        },
      });
    }
    

    // Generar un token JWT
    const token = jwt.sign({ id: user.uuid }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(200).json({
      message: "Inicio de sesión exitoso",
      token,
      user: {
        name: `${user.nombres} ${user.apellidos}`,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ message: "Error en el servidor", error: error.message });
  }
});


// Endpoint para solicitar el reseteo de contraseña
router.post("/reset-password-request", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Generar un token de reseteo
    const resetToken = jwt.sign({ id: user.uuid }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const contenidoPlantilla = fs.readFileSync(
      process.cwd() + process.env.RESET_PASS_USER,
      "utf8"
    );
    const dataEnvioEmail = JSON.parse(contenidoPlantilla);

    const contenidoHTML = fs.readFileSync(
      process.cwd() + dataEnvioEmail.html,
      "utf8"
    );
    parametros = dataEnvioEmail.Parametros;

    var contenidoHTMLModificado = contenidoHTML;
    for (let key in parametros) {
      const valueParametros = parametros[key] + resetToken;
      contenidoHTMLModificado = contenidoHTMLModificado.replace(
        key,
        valueParametros
      );
    }
    
    await sendEmail(
      user.email,
      dataEnvioEmail.Asunto,
      null,
      contenidoHTMLModificado
    );
    // Actualizar el campo 'password_changed' a true
    await user.update({ password_changed: true });
    res
      .status(200)
      .json({ message: "Correo de restablecimiento enviado", status: true });
  } catch (error) {
    console.error("Error en la solicitud de reseteo:", error);
    res.status(500).json({ message: "Error en el servidor", status: false });
  }
});

// Endpoint para verificar si el token es válido
router.post("/verifyResetToken", async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ where: { uuid: decoded.id } });

    if (!user) {
      return res
        .status(404)
        .json({
          message: "Token no válido o usuario no encontrado",
          status: false,
        });
    }

    // Verificar que password_changed sea true
    if (!user.password_changed) {
      return res.status(400).json({
        status: false,
        message: "La contraseña no ha sido solicitada para cambiarla",
      });
    }
    res.status(200).json({ message: "Token válido", status: true });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Token inválido o expirado", status: false });
  }
});

// Endpoint para establecer una nueva contraseña
router.post("/resetPassword", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ where: { uuid: decoded.id } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Usuario no encontrado", status: false });
    }

    if (!user.password_changed) {
      return res.status(400).json({
        status: false,
        message: "La contraseña no ha sido solicitada para cambiarla",
      });
    }
    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar la contraseña del usuario
    user.hashed_password = hashedPassword;
    user.salt = salt;
    user.password_changed = false;
    await user.save();

    res
      .status(200)
      .json({ message: "Contraseña actualizada exitosamente", status: true });
  } catch (error) {
    console.error("Error al restablecer la contraseña:", error);
    res.status(500).json({ message: "Error en el servidor", status: false });
  }
});

router.post("/verifyEmail",async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ status: false, message: "Token is required" });
    }

    // Decodificar el token
    const decodedUsername = Buffer.from(token, "base64").toString("utf-8");

    // Verificar si el username existe en la base de datos
    const user = await User.findOne({ where: { email: decodedUsername } });

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    // Verificar si el correo ya está verificado
    if (user.email_verified) {
      return res.status(400).json({
        status: false,
        message: "El Email ya ha sido verificado",
      });
    }

    // Actualizar el estado de email_verified a true
    user.verificacion_email = true;
    await user.save();

    // Responder que el correo ha sido verificado
    res.json({
      status: true,
      message: "Email verificado con éxito, ya puedes acceder a nuestra App",
      user: { username: user.username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Error verifying email" });
  }
})

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ where: { uuid: req.user.id } })
    if(!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });  
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
});



router.put("/profile", authMiddleware, async (req, res) => {
  const { nombres, apellidos, numero_celular, fecha_nacimiento, genero } = req.body;

  try {
    const updatedUser = await User.update(
      { nombres, apellidos, numero_celular, fecha_nacimiento, genero },
      { where: { uuid: req.user.id } }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json({message: "Datos de usuario actualizados", updatedUser});
  } catch (err) {
    res.status(500).json({ message: "Error al actualizar perfil" });
  }
});



module.exports = router;
