const categoryController = require('../controllers/categoryController');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/parse');

function validateBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) throw new AppError('El nombre es obligatorio (máx. 100 caracteres)');
  return { name };
}

async function list(req, res, next) {
  try {
    res.json(await categoryController.list());
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await categoryController.create(validateBody(req.body)));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json(await categoryController.update(parseId(req.params.id), validateBody(req.body)));
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    await categoryController.remove(parseId(req.params.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, update, remove };
