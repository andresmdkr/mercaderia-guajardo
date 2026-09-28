const { col, fn, literal, where } = require('sequelize');
const { Category, Product } = require('../db');
const AppError = require('../utils/AppError');

// Las categorías son pocas, así que se devuelven todas juntas (sin paginar).
function list() {
  return Category.findAll({
    attributes: {
      include: [[literal('(SELECT COUNT(*)::int FROM products WHERE products.category_id = "Category"."id")'), 'productCount']],
    },
    order: [[fn('LOWER', col('name')), 'ASC']],
  });
}

async function getById(id) {
  const category = await Category.findByPk(id);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  return category;
}

// El nombre es único sin importar mayúsculas (también hay un índice en la base que lo garantiza).
async function assertNameFree(name, exceptId) {
  const existing = await Category.findOne({ where: where(fn('LOWER', col('name')), name.toLowerCase()) });
  if (existing && existing.id !== exceptId) throw new AppError('Ya existe una categoría con ese nombre', 409);
}

async function create({ name }) {
  await assertNameFree(name);
  return Category.create({ name });
}

async function update(id, { name }) {
  const category = await getById(id);
  await assertNameFree(name, id);
  return category.update({ name });
}

async function remove(id) {
  const category = await getById(id);
  const inUse = await Product.count({ where: { categoryId: id } });
  if (inUse > 0) {
    throw new AppError(`No se puede eliminar: hay ${inUse} producto(s) con esta categoría`, 409);
  }
  await category.destroy();
}

module.exports = { list, getById, create, update, remove };
