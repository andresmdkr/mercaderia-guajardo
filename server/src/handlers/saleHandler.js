const saleController = require('../controllers/saleController');
const AppError = require('../utils/AppError');
const { parseDate, parseId, toPositiveInt } = require('../utils/parse');
const { parseSorting } = require('../utils/sorting');

const MAX_LIMIT = 100;
const MAX_LINES = 100;
const MAX_QUANTITY = 100000;
const PAYMENT_METHODS = ['cash', 'transfer', 'card'];
const STATUSES = ['completed', 'voided'];

function parseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new AppError('La venta necesita al menos un producto');
  if (rawItems.length > MAX_LINES) throw new AppError(`Una venta admite hasta ${MAX_LINES} líneas`);

  // Si un producto viene repetido, se suman las cantidades.
  const byProduct = new Map();
  for (const raw of rawItems) {
    const productId = Number(raw?.productId);
    const quantity = Number(raw?.quantity);
    if (!Number.isInteger(productId) || productId <= 0) throw new AppError('Producto inválido en la venta');
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QUANTITY) {
      throw new AppError('La cantidad de cada producto debe ser un entero mayor a 0');
    }
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity);
  }
  return [...byProduct].map(([productId, quantity]) => ({ productId, quantity }));
}

function parseDiscount(raw) {
  if (raw === undefined || raw === null) return null;
  const value = Number(raw.value);
  if (!['amount', 'percent'].includes(raw.type)) throw new AppError('El descuento debe ser por monto o por porcentaje');
  if (!Number.isFinite(value) || value < 0) throw new AppError('El descuento debe ser un número mayor o igual a 0');
  if (value === 0) return null; // descuento en cero = sin descuento
  if (raw.type === 'percent' && value > 100) throw new AppError('El porcentaje de descuento no puede superar 100');
  return { type: raw.type, value: Math.round(value * 100) / 100 };
}

function validateSaleBody(body) {
  const paymentMethod = body.paymentMethod;
  if (!PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('El medio de pago debe ser efectivo, transferencia o tarjeta');

  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 300) throw new AppError('Las notas admiten hasta 300 caracteres');

  const customerId = body.customerId == null || body.customerId === '' ? null : Number(body.customerId);
  if (customerId !== null && (!Number.isInteger(customerId) || customerId <= 0)) throw new AppError('Cliente inválido');

  return {
    items: parseItems(body.items),
    customerId,
    paymentMethod,
    discount: parseDiscount(body.discount),
    notes: notes || null,
  };
}

async function list(req, res, next) {
  try {
    const { page, limit, from, to, status, customerId, paymentMethod } = req.query;
    if (status && !STATUSES.includes(status)) throw new AppError('Estado inválido');
    if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) throw new AppError('Medio de pago inválido');

    const result = await saleController.list({
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), MAX_LIMIT),
      from: parseDate(from, 'desde'),
      to: parseDate(to, 'hasta', true),
      status: status || undefined,
      customerId: toPositiveInt(customerId, undefined),
      paymentMethod: paymentMethod || undefined,
      sorting: parseSorting(req.query),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await saleController.getById(parseId(req.params.id)));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    const sale = await saleController.create({ ...validateSaleBody(req.body), userId: req.user.id });
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
}

async function voidSale(req, res, next) {
  try {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length > 200) throw new AppError('El motivo admite hasta 200 caracteres');

    res.json(await saleController.voidSale(parseId(req.params.id), { reason: reason || null, userId: req.user.id }));
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, voidSale };
