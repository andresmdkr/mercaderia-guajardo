const customerController = require('../controllers/customerController');
const AppError = require('../utils/AppError');
const { parseBool, parseId, toPositiveInt } = require('../utils/parse');

const MAX_LIMIT = 100;
const MIN_PHONE_DIGITS = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve el texto recortado, o null si vino vacío. Lanza error si supera el largo máximo.
function optionalText(value, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maxLength) throw new AppError(`${label} admite hasta ${maxLength} caracteres`);
  return text || null;
}

function validateCustomerBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 150) throw new AppError('El nombre es obligatorio (máx. 150 caracteres)');

  // El teléfono no exige un formato: en Argentina se escribe de muchas formas.
  const email = optionalText(body.email, 'El email', 150);
  if (email && !EMAIL_REGEX.test(email)) throw new AppError('El email no es válido');

  return {
    name,
    phone: optionalText(body.phone, 'El teléfono', 50),
    email,
    address: optionalText(body.address, 'La dirección', 200),
    notes: optionalText(body.notes, 'Las notas', 1000),
  };
}

async function list(req, res, next) {
  try {
    const { page, limit, search, active } = req.query;
    const result = await customerController.list({
      page: toPositiveInt(page, 1),
      limit: Math.min(toPositiveInt(limit, 20), MAX_LIMIT),
      search: search?.trim(),
      active: parseBool(active),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await customerController.getById(parseId(req.params.id)));
  } catch (error) {
    next(error);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await customerController.create(validateCustomerBody(req.body)));
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    res.json(await customerController.update(parseId(req.params.id), validateCustomerBody(req.body)));
  } catch (error) {
    next(error);
  }
}

async function setStatus(req, res, next) {
  try {
    if (typeof req.body.active !== 'boolean') throw new AppError('"active" debe ser true o false');
    res.json(await customerController.setActive(parseId(req.params.id), req.body.active));
  } catch (error) {
    next(error);
  }
}

// GET /customers/phone-check?phone=...&excludeId=... → { duplicate: { id, name } | null }
async function checkPhone(req, res, next) {
  try {
    const digits = String(req.query.phone ?? '').replace(/\D/g, '');
    if (digits.length < MIN_PHONE_DIGITS) return res.json({ duplicate: null });

    const excludeId = toPositiveInt(req.query.excludeId, undefined);
    res.json({ duplicate: await customerController.findByPhone(digits, excludeId) });
  } catch (error) {
    next(error);
  }
}

module.exports = { list, getById, create, update, setStatus, checkPhone };
