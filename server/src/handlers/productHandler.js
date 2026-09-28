const productController = require('../controllers/productController');
const AppError = require('../utils/AppError');
const { parseBool, parseId, toPositiveInt } = require('../utils/parse');

const MAX_LIMIT = 100;

// Valida el body de alta / edición y devuelve solo los campos permitidos.
function validateProductBody(body) {
  if ('stock' in body) {
    throw new AppError('El stock no se edita desde el producto, se cambia con movimientos de stock');
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!code || code.length > 50) throw new AppError('El código es obligatorio (máx. 50 caracteres)');
  if (!name || name.length > 150) throw new AppError('El nombre es obligatorio (máx. 150 caracteres)');

  // La categoría es opcional: null o vacío = sin categoría.
  const categoryId = body.categoryId == null || body.categoryId === '' ? null : Number(body.categoryId);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    throw new AppError('Categoría inválida');
  }

  const costPrice = Number(body.costPrice);
  const salePrice = Number(body.salePrice);
  const minStock = Number(body.minStock ?? 0);

  if (!Number.isFinite(costPrice) || costPrice < 0) throw new AppError('El precio de costo debe ser un número mayor o igual a 0');
  if (!Number.isFinite(salePrice) || salePrice < 0) throw new AppError('El precio de venta debe ser un número mayor o igual a 0');
  if (!Number.isInteger(minStock) || minStock < 0) throw new AppError('El stock mínimo debe ser un entero mayor o igual a 0');

  return {
    code,
    name,
    categoryId,
    costPrice: Math.round(costPrice * 100) / 100,
    salePrice: Math.round(salePrice * 100) / 100,
    minStock,
  };
}

async function list(req, res, next) {
  try {
    const { page, limit, search, categoryId, lowStock, active } = req.query;
    const result = await productController.list({
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), MAX_LIMIT),
      search: search?.trim(),
      categoryId: toPositiveInt(categoryId, undefined),
      lowStock: parseBool(lowStock),
      active: parseBool(active),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await productController.getById(parseId(req.params.id)));
  } catch (error) {
    next(error);
  }
}

function parseInitialStock(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new AppError('El stock inicial debe ser un entero mayor o igual a 0');
  return n;
}

async function create(req, res, next) {
  try {
    const product = await productController.create(validateProductBody(req.body), {
      initialStock: parseInitialStock(req.body.initialStock),
      userId: req.user.id,
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const product = await productController.update(parseId(req.params.id), validateProductBody(req.body));
    res.json(product);
  } catch (error) {
    next(error);
  }
}

async function setStatus(req, res, next) {
  try {
    if (typeof req.body.active !== 'boolean') throw new AppError('"active" debe ser true o false');
    res.json(await productController.setActive(parseId(req.params.id), req.body.active));
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, setStatus };
