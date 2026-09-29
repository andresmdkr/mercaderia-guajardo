const AppError = require('./AppError');

// Orden de un listado pedido desde la pantalla: ?sort=campo&order=asc|desc.
// Cada controller define QUÉ campos se pueden ordenar (nunca se acepta un nombre de columna cualquiera).

// Lee y valida el pedido. Devuelve { sort, direction } ('ASC' | 'DESC'); sin `sort`, el controller usa su orden de siempre.
function parseSorting(query = {}) {
  const { sort, order } = query;
  if (sort !== undefined && typeof sort !== 'string') throw new AppError('Orden inválido');
  if (order !== undefined && order !== '' && !['asc', 'desc'].includes(order)) throw new AppError('El orden debe ser "asc" o "desc"');
  return { sort: sort || undefined, direction: order === 'desc' ? 'DESC' : 'ASC' };
}

// Arma el `order` de Sequelize. `fields` = { campo: (direction) => [ ...cláusulas ] }.
function buildOrder({ sort, direction }, fields, fallback) {
  if (!sort) return fallback;
  if (!Object.hasOwn(fields, sort)) throw new AppError(`No se puede ordenar por "${sort}"`);
  return fields[sort](direction);
}

module.exports = { parseSorting, buildOrder };
