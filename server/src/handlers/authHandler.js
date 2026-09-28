const authController = require('../controllers/authController');
const AppError = require('../utils/AppError');
const { COOKIE_NAME, signToken, cookieOptions } = require('../utils/token');

async function login(req, res, next) {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) throw new AppError('Ingresá usuario y contraseña');

    const user = await authController.login(username, password);
    res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
    res.json(user);
  } catch (error) {
    next(error);
  }
}

function logout(req, res) {
  const options = cookieOptions();
  delete options.maxAge; // clearCookie necesita las mismas opciones, sin maxAge
  res.clearCookie(COOKIE_NAME, options);
  res.status(204).end();
}

// requireAuth ya cargó el usuario en req.user.
function me(req, res) {
  res.json(req.user);
}

module.exports = { login, logout, me };
