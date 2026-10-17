const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../db');
const AppError = require('../utils/AppError');

// Todas las personas que usan el programa tienen los mismos permisos (no hay roles).

function list() {
  return User.findAll({ order: [['active', 'DESC'], ['name', 'ASC'], ['id', 'ASC']] });
}

async function create({ username, name, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return sequelize.transaction(async (transaction) => {
    // "Ana" y "ana" serían confusas: el usuario no puede repetirse sin importar mayúsculas.
    const taken = await User.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('username')), username.toLowerCase()), transaction });
    if (taken) throw new AppError('Ya hay un usuario con ese nombre de usuario', 409);
    return User.create({ username, name, passwordHash }, { transaction });
  });
}

// Dar de baja no borra nada: las ventas y los movimientos conservan quién los hizo. Una persona no puede darse de baja
// a sí misma (se quedaría afuera), y siempre queda al menos un usuario activo.
async function setActive(id, active, actingUserId) {
  return sequelize.transaction(async (transaction) => {
    const user = await User.findByPk(id, { transaction });
    if (!user) throw new AppError('Ese usuario no existe', 404);
    if (!active && user.id === actingUserId) throw new AppError('No podés darte de baja a vos mismo');
    if (!active) {
      const others = await User.count({ where: { active: true, id: { [Op.ne]: user.id } }, transaction });
      if (others === 0) throw new AppError('Tiene que quedar al menos un usuario activo');
    }
    await user.update({ active }, { transaction });
    return user;
  });
}

// Cambia la contraseña de otra persona (por ejemplo si la olvidó). Quien lo hace ya está dentro del programa.
async function resetPassword(id, password) {
  const user = await User.findByPk(id);
  if (!user) throw new AppError('Ese usuario no existe', 404);
  await user.update({ passwordHash: await bcrypt.hash(password, 10) });
  return user;
}

module.exports = { list, create, setActive, resetPassword };
