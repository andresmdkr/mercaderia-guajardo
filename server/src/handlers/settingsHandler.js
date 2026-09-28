const settingsController = require('../controllers/settingsController');
const AppError = require('../utils/AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve el texto recortado, o null si vino vacío. Lanza error si supera el largo máximo.
function optionalText(value, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > maxLength) throw new AppError(`${label} admite hasta ${maxLength} caracteres`);
  return text || null;
}

function validateBusinessBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 100) throw new AppError('El nombre del negocio es obligatorio (máx. 100 caracteres)');

  const email = optionalText(body.email, 'El email', 150);
  if (email && !EMAIL_REGEX.test(email)) throw new AppError('El email no es válido');

  return {
    name,
    address: optionalText(body.address, 'La dirección', 200),
    phone: optionalText(body.phone, 'El teléfono', 50),
    email,
  };
}

async function getBusiness(req, res, next) {
  try {
    res.json(await settingsController.getBusiness());
  } catch (error) {
    next(error);
  }
}

async function updateBusiness(req, res, next) {
  try {
    res.json(await settingsController.updateBusiness(validateBusinessBody(req.body)));
  } catch (error) {
    next(error);
  }
}

module.exports = { getBusiness, updateBusiness };
