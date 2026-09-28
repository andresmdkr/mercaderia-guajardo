const stockController = require('../controllers/stockController');
const AppError = require('../utils/AppError');
const { parseDate, toPositiveInt } = require('../utils/parse');

const MAX_LIMIT = 100;
const MANUAL_TYPES = ['in', 'out', 'adjustment'];
const FILTER_TYPES = [...MANUAL_TYPES, 'sale', 'sale_void'];

function parseInteger(value, label) {
  const n = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isInteger(n)) {
    throw new AppError(`${label} debe ser un número entero`);
  }
  return n;
}

function validateMovementBody(body) {
  const productId = toPositiveInt(body.productId, null);
  if (!productId) throw new AppError('Elegí un producto');

  if (!MANUAL_TYPES.includes(body.type)) throw new AppError('El tipo debe ser entrada, salida o ajuste');

  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length > 200) throw new AppError('El motivo admite hasta 200 caracteres');
  // Entrar mercadería es evidente; sacar o corregir stock tiene que quedar explicado.
  if (body.type !== 'in' && !reason) throw new AppError('El motivo es obligatorio para salidas y ajustes');

  const data = { productId, type: body.type, reason: reason || null };

  if (body.type === 'adjustment') {
    data.newStock = parseInteger(body.newStock, 'El stock real');
    if (data.newStock < 0) throw new AppError('El stock real no puede ser negativo');
  } else {
    data.quantity = parseInteger(body.quantity, 'La cantidad');
    if (data.quantity <= 0) throw new AppError('La cantidad debe ser mayor a 0');
  }
  return data;
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

module.exports = { list, create };
