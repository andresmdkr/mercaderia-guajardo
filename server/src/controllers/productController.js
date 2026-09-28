const { Op, col, where } = require('sequelize');
const { Category, Product } = require('../db');
const AppError = require('../utils/AppError');

const includeCategory = [{ model: Category, as: 'category', attributes: ['id', 'name'] }];

async function list({ page, limit, search, categoryId, lowStock, active }) {
  const conditions = [];

  if (search) {
    conditions.push({
      [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { code: { [Op.iLike]: `%${search}%` } }],
    });
  }
  if (categoryId) conditions.push({ categoryId });
  if (active !== undefined) conditions.push({ active });
  if (lowStock) conditions.push(where(col('stock'), Op.lte, col('min_stock')));

  const { rows, count } = await Product.findAndCountAll({
    where: { [Op.and]: conditions },
    include: includeCategory,
    order: [['name', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { items: rows, total: count, page, pages: Math.ceil(count / limit) };
}

async function getById(id) {
  const product = await Product.findByPk(id, { include: includeCategory });
  if (!product) throw new AppError('Producto no encontrado', 404);
  return product;
}

async function assertCategoryExists(categoryId) {
  if (categoryId === null) return;
  const exists = await Category.count({ where: { id: categoryId } });
  if (!exists) throw new AppError('La categoría no existe');
}

// El stock no se toca acá: arranca en 0 y solo cambia con movimientos de stock.
async function create(data) {
  await assertCategoryExists(data.categoryId);
  const product = await Product.create(data);
  return getById(product.id);
}

async function update(id, data) {
  const product = await getById(id);
  await assertCategoryExists(data.categoryId);
  await product.update(data);
  return getById(id);
}

async function setActive(id, active) {
  const product = await getById(id);
  await product.update({ active });
  return product;
}

module.exports = { list, getById, create, update, setActive };
