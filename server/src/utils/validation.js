const AppError = require('./AppError');

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,50}$/;
const MIN_PASSWORD = 8;
// bcrypt solo usa los primeros 72 caracteres; pedir menos evita que el resto se ignore en silencio.
const MAX_PASSWORD = 72;

function validateUsername(value) {
  const username = typeof value === 'string' ? value.trim() : '';
  if (!USERNAME_REGEX.test(username)) {
    throw new AppError('El usuario debe tener entre 3 y 50 caracteres: letras, números, punto, guion o guion bajo');
  }
  return username;
}

function validateName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 100) throw new AppError('El nombre es obligatorio (máx. 100 caracteres)');
  return name;
}

function validateNewPassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (password.length < MIN_PASSWORD) throw new AppError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
  if (password.length > MAX_PASSWORD) throw new AppError(`La contraseña admite hasta ${MAX_PASSWORD} caracteres`);
  return password;
}

module.exports = { validateUsername, validateName, validateNewPassword };
