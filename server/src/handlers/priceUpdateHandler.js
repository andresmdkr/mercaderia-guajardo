const priceUpdateController = require('../controllers/priceUpdateController');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/parse');

const ROUND_OPTIONS = [0, 1, 10, 50, 100, 500, 1000]; // en pesos; 0 = sin redondear
const ROUND_MODES = ['nearest', 'down', 'up']; // al más cercano, hacia abajo, hacia arriba
const MAX_PERCENT = 500;
const MAX_PRICE = 100_000_000; // pesos, igual que en productos
const MAX_OVERRIDES = 5000;

// Porcentaje (con hasta 2 decimales) → centésimas de punto entero (10,5 % = 1050).
function parsePercent(value, label) {
  const percent = Number(value);
  if (value === '' || value === null || !Number.isFinite(percent)) throw new AppError(`${label} inválido`);
  if (percent <= -100 || percent > MAX_PERCENT) throw new AppError(`${label} debe estar entre -99,99 y ${MAX_PERCENT}`);
  return Math.round(percent * 100);
}

// Precios a mano: { "<id de producto>": precio en pesos }. → { id: centavos }
function parseOverrides(value) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new AppError('Los precios a mano son inválidos');
  const entries = Object.entries(value);
  if (entries.length > MAX_OVERRIDES) throw new AppError('Hay demasiados precios a mano');
  const result = {};
  for (const [key, raw] of entries) {
    const id = Number(key);
    const price = typeof raw === 'number' ? raw : NaN;
    if (!Number.isInteger(id) || id <= 0) throw new AppError('Producto inválido en los precios a mano');
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) throw new AppError(`El precio a mano debe ser un número entre 0,01 y ${MAX_PRICE}`);
    result[id] = Math.round(price * 100);
  }
  return result;
}

// Body: { percent, categoryId?, roundTo?, roundMode?, costPercent?, overrides? }. costPercent vacío = el costo no se toca.
function parseParams(body = {}) {
  const percentBp = parsePercent(body.percent, 'El porcentaje');
  const costPercentBp = body.costPercent === undefined || body.costPercent === null ? null : parsePercent(body.costPercent, 'El porcentaje del costo');

  const categoryId = body.categoryId === undefined || body.categoryId === null || body.categoryId === '' ? null : Number(body.categoryId);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) throw new AppError('Categoría inválida');

  const roundTo = body.roundTo === undefined || body.roundTo === null || body.roundTo === '' ? 0 : Number(body.roundTo);
  if (!ROUND_OPTIONS.includes(roundTo)) throw new AppError(`El redondeo debe ser uno de: ${ROUND_OPTIONS.join(', ')}`);

  const roundMode = body.roundMode === undefined || body.roundMode === null || body.roundMode === '' ? 'nearest' : body.roundMode;
  if (!ROUND_MODES.includes(roundMode)) throw new AppError(`El modo de redondeo debe ser uno de: ${ROUND_MODES.join(', ')}`);

  const overrides = parseOverrides(body.overrides);

  if (percentBp === 0 && (costPercentBp === null || costPercentBp === 0)) throw new AppError('El porcentaje no puede ser 0');
  return { percentBp, costPercentBp, categoryId, roundTo, roundMode, overrides };
}

async function list(req, res, next) {
  try {
    res.json(await priceUpdateController.listBatches());
  } catch (error) {
    next(error);
  }
}

async function preview(req, res, next) {
  try {
    res.json(await priceUpdateController.preview(parseParams(req.body)));
  } catch (error) {
    next(error);
  }
}

// Body: lo mismo que la vista previa + expectedCount (el conteo que mostró).
async function apply(req, res, next) {
  try {
    const expectedCount = Number(req.body?.expectedCount);
    if (!Number.isInteger(expectedCount) || expectedCount <= 0) throw new AppError('Falta confirmar la cantidad de productos de la vista previa');
    res.status(201).json(await priceUpdateController.apply(parseParams(req.body), { expectedCount, userId: req.user.id }));
  } catch (error) {
    next(error);
  }
}

async function undo(req, res, next) {
  try {
    res.json(await priceUpdateController.undo(parseId(req.params.id)));
  } catch (error) {
    next(error);
  }
}

module.exports = { list, preview, apply, undo };
