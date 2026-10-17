const authController = require('../controllers/authController');
const { ipLimiter, userLimiter } = require('../utils/loginLimiter');
const AppError = require('../utils/AppError');
const { COOKIE_NAME, signToken, cookieOptions } = require('../utils/token');
const { validateName, validateNewPassword, validateUsername } = require('../utils/validation');

function startSession(res, user) {
  res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
}

async function login(req, res, next) {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) throw new AppError('Ingresá usuario y contraseña');

    // Límite de intentos: por persona + computadora, y por computadora sola (varios usuarios probados desde la misma PC).
    const userKey = `${req.ip}|${username.toLowerCase()}`;
    const wait = Math.max(userLimiter.secondsLeft(userKey), ipLimiter.secondsLeft(req.ip));
    if (wait > 0) throw new AppError(`Demasiados intentos. Probá de nuevo en ${Math.ceil(wait / 60)} ${Math.ceil(wait / 60) === 1 ? 'minuto' : 'minutos'}.`, 429);

    let user;
    try {
      user = await authController.login(username, password);
    } catch (error) {
      if (error.status === 401) {
        userLimiter.fail(userKey);
        ipLimiter.fail(req.ip);
      }
      throw error;
    }
    userLimiter.succeed(userKey);
    startSession(res, user);
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

// Público: le dice a la pantalla de ingreso si hay que crear el primer usuario.
async function setupStatus(req, res, next) {
  try {
    res.json({ needsSetup: await authController.needsSetup() });
  } catch (error) {
    next(error);
  }
}

// Público, pero solo funciona mientras no exista ningún usuario. Deja la sesión iniciada.
async function setup(req, res, next) {
  try {
    const user = await authController.setupFirstUser({
      username: validateUsername(req.body.username),
      name: validateName(req.body.name),
      password: validateNewPassword(req.body.password),
    });
    startSession(res, user);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    if (!currentPassword) throw new AppError('Ingresá tu contraseña actual');

    await authController.changePassword(req.user.id, currentPassword, validateNewPassword(req.body.newPassword));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { login, logout, me, setupStatus, setup, changePassword };
