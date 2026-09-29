const priceUpdateController = require('../controllers/priceUpdateController');
const AppError = require('../utils/AppError');
const { parseId } = require('../utils/parse');

const ROUND_OPTIONS = [0, 1, 10, 50, 100, 500, 1000]; // en pesos; 0 = sin redondear
const MAX_PERCENT = 500;

// Porcentaje (con hasta 2 decimales) → centésimas de punto entero (10,5 % = 1050).
function parsePercent(value, label) {
  const percent = Number(value);
  if (value === '' || value === null || !Number.isFinite(percent)) throw new AppError(`${label} inválido`);
  if (percent <= -100 || percent > MAX_PERCENT) throw new AppError(`${label} debe estar entre -99,99 y ${MAX_PERCENT}`);
  return Math.round(percent * 100);
}

// Body: { percent, categoryId?, roundTo?, costPercent? }. costPercent vacío = el costo no se toca.
function parseParams(body = {}) {
  const percentBp = parsePercent(body.percent, 'El porcentaje');
  const costPercentBp = body.costPercent === undefined || body.costPercent === null ? null : parsePercent(body.costPercent, 'El porcentaje del costo');

  const categoryId = body.categoryId === undefined || body.categoryId === null || body.categoryId === '' ? null : Number(body.categoryId);
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) throw new AppError('Categoría inválida');

  const roundTo = body.roundTo === undefined || body.roundTo === null || body.roundTo === '' ? 0 : Number(body.roundTo);
  if (!ROUND_OPTIONS.includes(roundTo)) throw new AppError(`El redondeo debe ser uno de: ${ROUND_OPTIONS.join(', ')}`);

  if (percentBp === 0 && (costPercentBp === null || costPercentBp === 0)) throw new AppError('El porcentaje no puede ser 0');
  return { percentBp, costPercentBp, categoryId, roundTo };
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
