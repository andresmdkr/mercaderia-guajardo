const backupController = require('../controllers/backupController');

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

module.exports = { list, create };
