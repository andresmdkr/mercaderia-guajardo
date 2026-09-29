const productController = require('../controllers/productController');
const AppError = require('../utils/AppError');
const { parseBool, parseId, toPositiveInt } = require('../utils/parse');
const { parseSorting } = require('../utils/sorting');

const MAX_LIMIT = 100;
// Topes razonables: más allá, los números pierden precisión (o son un error de tipeo).
const MAX_PRICE = 100_000_000; // pesos
const MAX_STOCK = 9_999_999; // unidades

// Valida el body de alta / edición y devuelve solo los campos permitidos.
// Al crear, el código puede venir vacío: entonces el sistema le asigna el siguiente (ver productController.create).
function validateProductBody(body, { codeOptional = false } = {}) {
  if ('stock' in body) {
    throw new AppError('El stock no se edita desde el producto, se cambia con movimientos de stock');
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (code.length > 50 || (!code && !codeOptional)) throw new AppError('El código es obligatorio (máx. 50 caracteres)');
  if (!name || name.length > 150) throw new AppError('El nombre es obligatorio (máx. 150 caracteres)');

  // La categoría es opcional: null o vacío = sin categoría.
  const categoryId = body.categoryId == null || body.categoryId === '' ? null : Number(body.categoryId);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    throw new AppError('Categoría inválida');
  }

  const costPrice = Number(body.costPrice);
  const salePrice = Number(body.salePrice);
  const minStock = Number(body.minStock ?? 0);

  if (!Number.isFinite(costPrice) || costPrice < 0 || costPrice > MAX_PRICE) throw new AppError(`El precio de costo debe ser un número entre 0 y ${MAX_PRICE}`);
  if (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > MAX_PRICE) throw new AppError(`El precio de venta debe ser un número entre 0 y ${MAX_PRICE}`);
  if (!Number.isInteger(minStock) || minStock < 0 || minStock > MAX_STOCK) throw new AppError(`El stock mínimo debe ser un entero entre 0 y ${MAX_STOCK}`);

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
      sorting: parseSorting(req.query),
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
  if (!Number.isInteger(n) || n < 0 || n > MAX_STOCK) throw new AppError(`El stock inicial debe ser un entero entre 0 y ${MAX_STOCK}`);
  return n;
}

async function getByCode(req, res, next) {
  try {
    const code = String(req.params.code ?? '').trim();
    if (!code) throw new AppError('Ingresá un código');
    res.json(await productController.getByCode(code));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const product = await productController.create(validateProductBody(req.body, { codeOptional: true }), {
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

module.exports = { list, getById, getByCode, create, update, setStatus };
