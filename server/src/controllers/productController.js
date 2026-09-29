const { Op, QueryTypes, col, fn, where } = require('sequelize');
const { sequelize, Category, Product } = require('../db');
const AppError = require('../utils/AppError');
const { searchCondition } = require('../utils/searchText');
const { applyMovement } = require('./stockController');

const includeCategory = [{ model: Category, as: 'category', attributes: ['id', 'name'] }];

async function list({ page, limit, search, categoryId, lowStock, active }) {
  const conditions = [];

  // Ignora mayúsculas y tildes. Las columnas van calificadas porque la consulta también une la tabla de categorías.
  if (search) conditions.push(searchCondition(['"Product"."name"', '"Product"."code"'], search));
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

// Para escanear o tipear el código en la pantalla de venta: coincidencia exacta, sin distinguir mayúsculas.
async function getByCode(code) {
  const product = await Product.findOne({
    where: where(fn('LOWER', col('code')), code.toLowerCase()),
    include: includeCategory,
  });
  if (!product) throw new AppError('No existe un producto con ese código', 404);
  if (!product.active) throw new AppError(`"${product.name}" está dado de baja`, 409);
  return product;
}

async function assertCategoryExists(categoryId) {
  if (categoryId === null) return;
  const exists = await Category.count({ where: { id: categoryId } });
  if (!exists) throw new AppError('La categoría no existe');
}

// Código automático: P00001, P00002... el siguiente al más alto que ya exista con ese formato. Los demás códigos
// (los que se escanean o se escriben a mano) no cuentan. Va dentro de la transacción de alta: como las transacciones
// corren en fila, dos altas seguidas nunca reciben el mismo número.
async function nextAutoCode(transaction) {
  const [row] = await sequelize.query(
    `SELECT MAX(CAST(SUBSTR(code, 2) AS INTEGER)) AS last
     FROM products
     WHERE code GLOB '[Pp][0-9]*' AND SUBSTR(code, 2) NOT GLOB '*[^0-9]*' AND LENGTH(code) <= 10`,
    { type: QueryTypes.SELECT, transaction }
  );
  return `P${String((row.last ?? 0) + 1).padStart(5, '0')}`;
}

// El stock no se escribe directo: arranca en 0 y, si hay stock inicial, entra como un
// movimiento (dentro de la misma transacción, así o se crea todo o nada).
// Si no viene código, se le asigna uno automático.
async function create(data, { initialStock = 0, userId } = {}) {
  await assertCategoryExists(data.categoryId);

  const productId = await sequelize.transaction(async (transaction) => {
    const code = data.code || (await nextAutoCode(transaction));
    const product = await Product.create({ ...data, code }, { transaction });
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

module.exports = { list, getById, getByCode, create, update, setActive };
