const { col, fn, literal } = require('sequelize');
const { Category, Product } = require('../db');
const AppError = require('../utils/AppError');
const { normalizeText } = require('../utils/searchText');

// Las categorías son pocas, así que se devuelven todas juntas (sin paginar).
function list() {
  return Category.findAll({
    attributes: {
      include: [[literal('(SELECT COUNT(*) FROM products WHERE products.category_id = "Category"."id")'), 'productCount']],
    },
    order: [[fn('LOWER', col('name')), 'ASC']],
  });
}

async function getById(id) {
  const category = await Category.findByPk(id);
  if (!category) throw new AppError('Categoría no encontrada', 404);
  return category;
}

// El nombre es único sin importar mayúsculas ni tildes ("Lácteos" = "lacteos"). La base tiene un índice que garantiza lo de
// las mayúsculas; las tildes se comparan acá (las categorías son pocas).
async function assertNameFree(name, exceptId) {
  const wanted = normalizeText(name);
  const all = await Category.findAll({ attributes: ['id', 'name'] });
  if (all.some((category) => category.id !== exceptId && normalizeText(category.name) === wanted)) {
    throw new AppError('Ya existe una categoría con ese nombre', 409);
  }
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
