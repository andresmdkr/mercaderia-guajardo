const bcrypt = require('bcryptjs');
const { User } = require('../db');
const AppError = require('../utils/AppError');

// Hash de mentira para que el tiempo de respuesta sea parecido si el usuario no existe.
const DUMMY_HASH = bcrypt.hashSync('no-such-user', 10);

async function login(username, password) {
  const user = await User.findOne({ where: { username } });
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !valid) throw new AppError('Usuario o contraseña incorrectos', 401);
  return user;
}

function findById(id) {
  return User.findByPk(id);
}

async function createUser({ username, name, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({ username, name, passwordHash });
}

module.exports = { login, findById, createUser };
