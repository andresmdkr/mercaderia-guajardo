const authController = require('../controllers/authController');
const AppError = require('../utils/AppError');
const { COOKIE_NAME, verifyToken } = require('../utils/token');

// Exige una sesión válida; deja el usuario en req.user.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) throw new AppError('No autenticado', 401);

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Sesión inválida o vencida', 401);
    }

    // Se busca en la base para que un usuario borrado pierda el acceso enseguida.
    const user = await authController.findById(payload.sub);
    if (!user) throw new AppError('No autenticado', 401);

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth };
