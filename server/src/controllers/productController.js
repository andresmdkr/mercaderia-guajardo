const { Op, col, where } = require('sequelize');
const { sequelize, Category, Product } = require('../db');
const AppError = require('../utils/AppError');
const { applyMovement } = require('./stockController');

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

// El stock no se escribe directo: arranca en 0 y, si hay stock inicial, entra como un
// movimiento (dentro de la misma transacción, así o se crea todo o nada).
async function create(data, { initialStock = 0, userId } = {}) {
  await assertCategoryExists(data.categoryId);

  const productId = await sequelize.transaction(async (transaction) => {
    const product = await Product.create(data, { transaction });
    if (initialStock > 0) {
      await applyMovement(
        { productId: product.id, type: 'in', quantity: initialStock, reason: 'Stock inicial', userId },
        { transaction }
      );
    }
    return product.id;
  });

  return getById(productId);
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
