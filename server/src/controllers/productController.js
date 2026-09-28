const { Op, col, where } = require('sequelize');
const { Product } = require('../db');
const AppError = require('../utils/AppError');

async function list({ page, limit, search, category, lowStock, active }) {
  const conditions = [];

  if (search) {
    conditions.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { code: { [Op.iLike]: `%${search}%` } }],
    });
  }
  if (category) conditions.push({ category });
  if (active !== undefined) conditions.push({ active });
  if (lowStock) conditions.push(where(col('stock'), Op.lte, col('min_stock')));

  const { rows, count } = await Product.findAndCountAll({
    where: { [Op.and]: conditions },
    order: [['name', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

async function getById(id) {
  const product = await Product.findByPk(id);
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

// El stock no se toca acá: arranca en 0 y solo cambia con movimientos de stock.
function create(data) {
  return Product.create(data);
}

async function update(id, data) {
  const product = await getById(id);
  return product.update(data);
}

async function setActive(id, active) {
  const product = await getById(id);
  return product.update({ active });
}

module.exports = { list, getById, create, update, setActive };
