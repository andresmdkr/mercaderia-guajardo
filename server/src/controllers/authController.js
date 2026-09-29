const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../db');
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

// La app recién instalada no tiene usuarios: la primera vez se pide crear el administrador.
async function needsSetup() {
  return (await User.count()) === 0;
}

// Crea el primer usuario, y solo si todavía no existe ninguno. La transacción toma el candado de
// escritura desde el principio, así que dos pedidos simultáneos no pueden crear dos administradores.
async function setupFirstUser(data) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return sequelize.transaction(async (transaction) => {
    if ((await User.count({ transaction })) > 0) throw new AppError('La aplicación ya fue configurada', 409);
    return User.create({ username: data.username, name: data.name, passwordHash }, { transaction });
  });
}

// Los errores usan 400 (no 401): un 401 le haría creer al frontend que la sesión venció.
async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('La contraseña actual no es correcta');
  }
  if (currentPassword === newPassword) throw new AppError('La contraseña nueva tiene que ser distinta de la actual');

  await user.update({ passwordHash: await bcrypt.hash(newPassword, 10) });
}

module.exports = { login, findById, createUser, needsSetup, setupFirstUser, changePassword };
