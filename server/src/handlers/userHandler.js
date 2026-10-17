const userController = require('../controllers/userController');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/parse');
const { validateName, validateNewPassword, validateUsername } = require('../utils/validation');

async function list(req, res, next) {
  try {
    res.json(await userController.list());
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const user = await userController.create({
      username: validateUsername(req.body.username),
      name: validateName(req.body.name),
      password: validateNewPassword(req.body.password),
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

// Body: { active: true | false }
async function setActive(req, res, next) {
  try {
    if (typeof req.body.active !== 'boolean') throw new AppError('Indicá si el usuario queda activo o de baja');
    res.json(await userController.setActive(parseId(req.params.id), req.body.active, req.user.id));
  } catch (error) {
    next(error);
  }
}

// Body: { password }
async function resetPassword(req, res, next) {
  try {
    await userController.resetPassword(parseId(req.params.id), validateNewPassword(req.body.password));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, setActive, resetPassword };
