// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Token después de 'Bearer'

  if (!token) return res.sendStatus(401); // Si no hay token, retorna 401 (Unauthorized)

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Si el token es inválido, retorna 403 (Forbidden)
    
    req.user = user; // Almacena los datos del usuario decodificado en req.user
    next(); // Continua con el siguiente middleware o controlador
  });
};





module.exports = authenticateToken;
