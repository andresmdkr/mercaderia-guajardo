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

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Fecha "AAAA-MM-DD" en hora local; `endOfDay` la lleva al último instante del día.
function parseDate(value, label, endOfDay = false) {
  if (value === undefined || value === '') return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  if (!DATE_REGEX.test(value) || Number.isNaN(date.getTime())) {
    throw new AppError(`Fecha "${label}" inválida (usar AAAA-MM-DD)`);
  }
  return date;
}

module.exports = { toPositiveInt, parseBool, parseId, parseDate };
