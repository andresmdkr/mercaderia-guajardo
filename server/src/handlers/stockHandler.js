const stockController = require('../controllers/stockController');
const AppError = require('../utils/AppError');
const { parseDate, toPositiveInt } = require('../utils/parse');

const MAX_LIMIT = 100;
const MAX_BULK_ITEMS = 200;
const MANUAL_TYPES = ['in', 'out', 'adjustment'];
const FILTER_TYPES = [...MANUAL_TYPES, 'sale', 'sale_void'];

function parseInteger(value, label) {
  const n = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isInteger(n)) {
    throw new AppError(`${label} debe ser un número entero`);
  }
  return n;
}

// Tipo y motivo, comunes al movimiento simple y al múltiple.
function validateTypeAndReason(body) {
  if (!MANUAL_TYPES.includes(body.type)) throw new AppError('El tipo debe ser entrada, salida o ajuste');

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 200) throw new AppError('El motivo admite hasta 200 caracteres');
  // Entrar mercadería es evidente; sacar o corregir stock tiene que quedar explicado.
  if (body.type !== 'in' && !reason) throw new AppError('El motivo es obligatorio para salidas y ajustes');
  return { type: body.type, reason: reason || null };
}

// Cantidad (entrada/salida) o stock real (ajuste) de un renglón.
function validateAmount(type, source) {
  if (type === 'adjustment') {
    const newStock = parseInteger(source.newStock, 'El stock real');
    if (newStock < 0) throw new AppError('El stock real no puede ser negativo');
    return { newStock };
  }
  const quantity = parseInteger(source.quantity, 'La cantidad');
  if (quantity <= 0) throw new AppError('La cantidad debe ser mayor a 0');
  return { quantity };
}

function validateMovementBody(body) {
  const productId = toPositiveInt(body.productId, null);
  if (!productId) throw new AppError('Elegí un producto');

  const { type, reason } = validateTypeAndReason(body);
  return { productId, type, reason, ...validateAmount(type, body) };
}

function validateBulkBody(body) {
  const { type, reason } = validateTypeAndReason(body);
  if (!Array.isArray(body.items) || body.items.length === 0) throw new AppError('Agregá al menos un producto');
  if (body.items.length > MAX_BULK_ITEMS) throw new AppError(`Un movimiento admite hasta ${MAX_BULK_ITEMS} productos`);

  const seen = new Set();
  const items = body.items.map((raw, index) => {
    const productId = toPositiveInt(raw?.productId, null);
    if (!productId) throw new AppError(`Renglón ${index + 1}: elegí un producto`);
    if (seen.has(productId)) throw new AppError(`Renglón ${index + 1}: el producto está repetido`);
    seen.add(productId);
    try {
      return { productId, ...validateAmount(type, raw) };
    } catch (error) {
      error.message = `Renglón ${index + 1}: ${error.message}`;
      throw error;
    }
  });
  return { type, reason, items };
}

async function list(req, res, next) {
  try {
    const { page, limit, productId, type, from, to } = req.query;
    if (type && !FILTER_TYPES.includes(type)) throw new AppError('Tipo de movimiento inválido');

    const result = await stockController.list({
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), MAX_LIMIT),
      productId: toPositiveInt(productId, undefined),
      type: type || undefined,
      from: parseDate(from, 'desde'),
      to: parseDate(to, 'hasta', true),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const data = validateMovementBody(req.body);
    const movement = await stockController.applyMovement({ ...data, userId: req.user.id });
    res.status(201).json(await stockController.getById(movement.id));
  } catch (error) {
    next(error);
  }
}

async function createBulk(req, res, next) {
  try {
    const data = validateBulkBody(req.body);
    const { movements, skipped } = await stockController.applyBulk({ ...data, userId: req.user.id });
    res.status(201).json({ count: movements.length, skipped });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, create, createBulk };
