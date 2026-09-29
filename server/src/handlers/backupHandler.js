const backupController = require('../controllers/backupController');
const AppError = require('../utils/AppError');

function list(req, res, next) {
  try {
    res.json(backupController.list());
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await backupController.create());
  } catch (error) {
    next(error);
  }
}

function externalStatus(req, res, next) {
  try {
    res.json(backupController.externalStatus());
  } catch (error) {
    next(error);
  }
}

// Body: { folder: 'D:\Copias' } para elegir la carpeta, o { folder: null } para quitarla.
async function setExternalFolder(req, res, next) {
  try {
    const { folder } = req.body ?? {};
    if (folder !== null && typeof folder !== 'string') throw new AppError('Indicá la carpeta o null para quitarla');
    res.json(await backupController.setExternalFolder(folder));
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, externalStatus, setExternalFolder };
