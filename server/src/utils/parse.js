const AppError = require('./AppError');

// Helpers para leer y validar parámetros de la URL / query string.

function toPositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseBool(value) {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new AppError('Valor booleano inválido (usar true o false)');
}

function parseId(value) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) throw new AppError('Id inválido');
  return id;
}

module.exports = { toPositiveInt, parseBool, parseId };
