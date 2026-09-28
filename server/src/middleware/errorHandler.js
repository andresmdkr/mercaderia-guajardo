const { UniqueConstraintError, ValidationError } = require('sequelize');

// Mensajes para violaciones de unicidad, según la restricción de Postgres que chocó.
const UNIQUE_MESSAGES = {
  products_code_key: 'Ya existe un producto con ese código',
  users_username_key: 'Ya existe un usuario con ese nombre',
  categories_name_lower_unique: 'Ya existe una categoría con ese nombre',
};

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof UniqueConstraintError) {
    const message = UNIQUE_MESSAGES[error.parent?.constraint] ?? 'Ya existe un registro con esos datos';
    return res.status(409).json({ message });
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
