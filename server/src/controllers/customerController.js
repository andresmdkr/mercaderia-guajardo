const { Op, literal, where } = require('sequelize');
const { Customer } = require('../db');
const AppError = require('../utils/AppError');
const { searchCondition } = require('../utils/searchText');
const { buildOrder } = require('../utils/sorting');

// Columnas por las que se puede ordenar el listado (texto sin distinguir mayúsculas). Siempre desempata por id.
const SORT_FIELDS = {
  name: (d) => [[literal('LOWER("Customer"."name")'), d], ['id', 'ASC']],
  phone: (d) => [[literal(`LOWER(COALESCE("Customer"."phone", ''))`), d], [literal('LOWER("Customer"."name")'), 'ASC'], ['id', 'ASC']],
  email: (d) => [[literal(`LOWER(COALESCE("Customer"."email", ''))`), d], [literal('LOWER("Customer"."name")'), 'ASC'], ['id', 'ASC']],
};

async function list({ page, limit, search, active, sorting }) {
  const conditions = [];

  // Ignora mayúsculas y tildes (nombre, teléfono y email).
  if (search) conditions.push(searchCondition(['"Customer"."name"', '"Customer"."phone"', '"Customer"."email"'], search));
  if (active !== undefined) conditions.push({ active });

  const { rows, count } = await Customer.findAndCountAll({
    where: { [Op.and]: conditions },
    order: buildOrder(sorting ?? {}, SORT_FIELDS, SORT_FIELDS.name('ASC')),
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

async function getById(id) {
  const customer = await Customer.findByPk(id);
  if (!customer) throw new AppError('Cliente no encontrado', 404);
  return customer;
}

function create(data) {
  return Customer.create(data);
}

async function update(id, data) {
  const customer = await getById(id);
  return customer.update(data);
}

async function setActive(id, active) {
  const customer = await getById(id);
  return customer.update({ active });
}

// El teléfono sin espacios, guiones, puntos, paréntesis ni "+" (SQLite no tiene expresiones regulares).
const PHONE_DIGITS_SQL = ['\' \'', '\'-\'', '\'.\'', '\'(\'', '\')\'', '\'+\'']
  .reduce((expression, character) => `REPLACE(${expression}, ${character}, '')`, 'phone');

// Busca otro cliente con el mismo teléfono comparando solo los dígitos
// ("11 5555-1234" y "1155551234" son el mismo número). Es solo un aviso, no bloquea nada.
async function findByPhone(digits, excludeId) {
  const conditions = [where(literal(PHONE_DIGITS_SQL), digits)];
  if (excludeId) conditions.push({ id: { [Op.ne]: excludeId } });

  return Customer.findOne({ where: { [Op.and]: conditions }, attributes: ['id', 'name'] });
}

module.exports = { list, getById, create, update, setActive, findByPhone };
