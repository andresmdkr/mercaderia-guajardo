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

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: EXPIRES_HOURS * 60 * 60 * 1000,
});

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
