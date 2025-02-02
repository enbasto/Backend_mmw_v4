const express = require('express');
const Number = require('../models/number'); // El modelo Number que creaste arriba
const authenticateToken = require('../middlewares/authMiddleware'); // Importa el middleware

const router = express.Router();

// Ruta para obtener todos los números asociados al ID del usuario
router.get('/numbers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Supongo que el ID está en el token decodificado

    // Buscar todos los números asociados al userId
    const numbers = await Number.findAll({
      where: { uuid: userId }, // Usar el id obtenido del token
    });

    if (numbers.length === 0) {
      return res.status(404).json({ message: 'No se Encontraron Números registrados' });
    }

    // Retornar los números encontrados
    res.json(numbers);
  } catch (error) {
    res.status(500).json({ message: 'Error Obteniendo Números' });
  }
});

module.exports = router;
