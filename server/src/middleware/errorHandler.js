const { UniqueConstraintError, ValidationError } = require('sequelize');

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof UniqueConstraintError) {
    return res.status(409).json({ message: 'Ya existe un registro con ese código' });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido' });
  }

  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}

module.exports = errorHandler;
