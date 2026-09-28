const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'token';
const EXPIRES_HOURS = 8;

function getSecret() {
  if (!process.env.JWT_SECRET) throw new Error('Falta JWT_SECRET en server/.env');
  return process.env.JWT_SECRET;
}

const signToken = (userId) => jwt.sign({ sub: userId }, getSecret(), { expiresIn: `${EXPIRES_HOURS}h` });

// Lanza error si el token es inválido o venció.
const verifyToken = (token) => jwt.verify(token, getSecret());

// "secure" hace que la cookie solo viaje por HTTPS. En producción queda activo, salvo que la app
// corra localmente por http (versión de escritorio): ahí se define COOKIE_SECURE=false.
const isSecure = () =>
  process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production';

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isSecure(),
  maxAge: EXPIRES_HOURS * 60 * 60 * 1000,
});

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
