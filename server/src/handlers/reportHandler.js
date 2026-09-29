const reportController = require('../controllers/reportController');
const AppError = require('../utils/AppError');
const { parseDate, toPositiveInt } = require('../utils/parse');

const MAX_TOP = 50;
const MAX_LIMIT = 100;
const SORTS = ['quantity', 'revenue'];

// Lee el período (?from=AAAA-MM-DD&to=AAAA-MM-DD) y valida que tenga sentido.
function parsePeriod(query) {
  const from = parseDate(query.from, 'desde');
  const to = parseDate(query.to, 'hasta', true);
  if (from && to && from > to) throw new AppError('La fecha "desde" no puede ser posterior a "hasta"');
  return { from, to };
}

async function summary(req, res, next) {
  try {
    res.json(await reportController.summary(parsePeriod(req.query)));
  } catch (error) {
    next(error);
  }
}

async function topProducts(req, res, next) {
  try {
    const sort = req.query.sort ?? 'quantity';
    if (!SORTS.includes(sort)) throw new AppError('El orden debe ser "quantity" o "revenue"');

    res.json(
      await reportController.topProducts({
        ...parsePeriod(req.query),
        limit: Math.min(toPositiveInt(req.query.limit, 10), MAX_TOP),
        sort,
      })
    );
  } catch (error) {
    next(error);
  }
}

async function lowStock(req, res, next) {
  try {
    res.json(
      await reportController.lowStock({
        page: toPositiveInt(req.query.page, 1),
        limit: Math.min(toPositiveInt(req.query.limit, 20), MAX_LIMIT),
      })
    );
  } catch (error) {
    next(error);
  }
}

async function paymentMethods(req, res, next) {
  try {
    res.json(await reportController.paymentMethods(parsePeriod(req.query)));
  } catch (error) {
    next(error);
  }
}

async function topCustomers(req, res, next) {
  try {
    res.json(await reportController.topCustomers({ ...parsePeriod(req.query), limit: Math.min(toPositiveInt(req.query.limit, 10), MAX_TOP) }));
  } catch (error) {
    next(error);
  }
}

// ?from=AAAA-MM-DD&to=AAAA-MM-DD (los dos opcionales; sin ellos, todo el historial). Un día es from = to.
// Cada día va de las 00:00 a las 23:59:59 en hora local.
async function periodSummary(req, res, next) {
  try {
    const period = parsePeriod(req.query);
    res.json({ from: req.query.from || null, to: req.query.to || null, ...(await reportController.periodSummary(period)) });
  } catch (error) {
    next(error);
  }
}

module.exports = { summary, topProducts, lowStock, paymentMethods, topCustomers, periodSummary };
