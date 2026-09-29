const { UniqueConstraintError, ValidationError } = require('sequelize');

// Mensajes para violaciones de unicidad. SQLite informa la columna o el índice que chocó
// ("UNIQUE constraint failed: products.code"), y se busca ese texto en el mensaje.
const UNIQUE_MESSAGES = [
  ['products.code', 'Ya existe un producto con ese código'],
  ['users.username', 'Ya existe un usuario con ese nombre'],
  ['categories_name_lower_unique', 'Ya existe una categoría con ese nombre'],
];

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof UniqueConstraintError) {
    const text = `${error.parent?.message ?? ''} ${error.message}`;
    const found = UNIQUE_MESSAGES.find(([fragment]) => text.includes(fragment));
    return res.status(409).json({ message: found ? found[1] : 'Ya existe un registro con esos datos' });
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
