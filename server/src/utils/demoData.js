// Datos de ejemplo: los usa `npm run seed` (desarrollo) y el modo de prueba de la app de escritorio.
// Todo pasa por los mismos controllers que usa la app (stock con applyMovement, ventas con saleController):
// así los datos de ejemplo cumplen las mismas reglas que los reales.
const { QueryTypes } = require('sequelize');
const { sequelize, BusinessSettings, Category, Customer, Product, StockMovement, User } = require('../db');
const authController = require('../controllers/authController');
const saleController = require('../controllers/saleController');
const { applyMovement } = require('../controllers/stockController');

const DEMO_USER = { username: 'demo', name: 'Usuario de prueba', password: 'demo1234' };
const DAYS_OF_HISTORY = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const CATEGORIES = ['Almacén', 'Bebidas', 'Limpieza', 'Lácteos', 'Golosinas'];

// [código, nombre, categoría, costo, venta, stock mínimo]
const PRODUCTS = [
  ['ALM001', 'Yerba mate 1kg', 'Almacén', 3200, 4500, 5],
  ['ALM002', 'Fideos tirabuzón 500g', 'Almacén', 900, 1400, 10],
  ['ALM003', 'Arroz largo fino 1kg', 'Almacén', 1100, 1700, 8],
  ['ALM004', 'Aceite girasol 900ml', 'Almacén', 2100, 3000, 6],
  ['ALM005', 'Azúcar 1kg', 'Almacén', 1000, 1500, 8],
  ['BEB001', 'Gaseosa cola 2,25L', 'Bebidas', 2200, 3200, 6],
  ['BEB002', 'Agua mineral 1,5L', 'Bebidas', 800, 1300, 12],
  ['BEB003', 'Cerveza lata 473ml', 'Bebidas', 1300, 1900, 12],
  ['LIM001', 'Lavandina 1L', 'Limpieza', 700, 1100, 6],
  ['LIM002', 'Detergente 750ml', 'Limpieza', 1200, 1800, 6],
  ['LIM003', 'Papel higiénico x4', 'Limpieza', 1500, 2300, 8],
  ['LAC001', 'Leche entera 1L', 'Lácteos', 1000, 1500, 10],
  ['LAC002', 'Yogur bebible 1L', 'Lácteos', 1400, 2100, 6],
  ['GOL001', 'Alfajor triple', 'Golosinas', 600, 1000, 15],
  ['GOL002', 'Chocolate 100g', 'Golosinas', 1300, 2000, 8],
];

// Stock inicial por código. Varios quedan en o bajo el mínimo, para probar "stock bajo".
const INITIAL_STOCK = {
  ALM001: 3, ALM002: 24, ALM003: 15, ALM004: 9, ALM005: 20,
  BEB001: 12, BEB002: 12, BEB003: 30,
  LIM001: 10, LIM002: 8, LIM003: 5,
  LAC001: 4, LAC002: 10,
  GOL001: 40, GOL002: 14,
};

// [nombre, teléfono, email, dirección, notas]
const CUSTOMERS = [
  ['María Pérez', '11 5555-1234', 'maria.perez@example.com', 'Av. Rivadavia 1234', 'Paga los viernes'],
  ['Juan Gómez', '11 4444-5678', null, 'San Martín 456', null],
  ['Lucía Fernández', '351 555-9012', 'lucia.f@example.com', null, 'Prefiere transferencia'],
  ['Carlos Rodríguez', '11 6666-3456', null, 'Belgrano 789', null],
  ['Ana Martínez', null, 'ana.martinez@example.com', null, null],
];

// Las fechas van a SQL a mano en el mismo formato en que las guarda SQLite (ver reportController).
const dbDate = (date) => date.toISOString().replace('T', ' ').replace('Z', ' +00:00');

/**
 * Categorías, productos, clientes y stock inicial (como movimientos). Se puede repetir sin duplicar:
 * el stock solo se carga a productos sin historial. `stockFactor` multiplica el stock inicial.
 */
async function loadCatalog({ userId, stockFactor = 1 }) {
  const categoryIds = {};
  for (const name of CATEGORIES) {
    const [category] = await Category.findOrCreate({ where: { name }, defaults: { name } });
    categoryIds[name] = category.id;
  }

  let products = 0;
  for (const [code, name, category, costPrice, salePrice, minStock] of PRODUCTS) {
    const [, isNew] = await Product.findOrCreate({
      where: { code },
      defaults: { code, name, costPrice, salePrice, minStock, categoryId: categoryIds[category] },
    });
    if (isNew) products += 1;
  }

  let stocked = 0;
  // Un movimiento necesita un usuario: sin él (seed en una base sin usuarios) se omite el stock.
  for (const [code, quantity] of userId ? Object.entries(INITIAL_STOCK) : []) {
    const product = await Product.findOne({ where: { code } });
    if (!product || (await StockMovement.count({ where: { productId: product.id } })) > 0) continue;
    await applyMovement({
      productId: product.id,
      type: 'in',
      quantity: quantity * stockFactor,
      reason: 'Stock inicial (datos de ejemplo)',
      userId,
    });
    stocked += 1;
  }

  let customers = 0;
  for (const [name, phone, email, address, notes] of CUSTOMERS) {
    const [, isNew] = await Customer.findOrCreate({ where: { name }, defaults: { name, phone, email, address, notes } });
    if (isNew) customers += 1;
  }

  return { categories: CATEGORIES.length, products, stocked, customers };
}

// Generador pseudoaleatorio con semilla: la demo sale igual cada vez (y las pruebas son estables).
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length)];

// Ventas de los últimos días, en orden cronológico (así los números de venta siguen el orden del tiempo).
// Se crean con saleController y después se les corrige la fecha, que la app siempre pone en "ahora".
async function loadSales({ userId, now = new Date() }) {
  const random = makeRandom(20260929);
  const products = await Product.findAll({ where: { active: true }, order: [['id', 'ASC']] });
  const customers = await Customer.findAll({ order: [['id', 'ASC']] });
  const methods = ['cash', 'cash', 'cash', 'transfer', 'transfer', 'card'];

  const plan = [];
  for (let day = DAYS_OF_HISTORY - 1; day >= 0; day -= 1) {
    const count = day === 0 ? 5 : 3 + Math.floor(random() * 4);
    for (let n = 0; n < count; n += 1) {
      // Horas atrás dentro del día (entre 0,5 y 10 hs antes de la misma hora de ese día): nunca queda en el futuro.
      plan.push(new Date(now.getTime() - day * DAY_MS - (0.5 + random() * 9.5) * 60 * 60 * 1000));
    }
  }
  plan.sort((a, b) => a - b);

  const created = [];
  for (const at of plan) {
    const lines = new Map();
    const lineCount = 1 + Math.floor(random() * 4);
    for (let i = 0; i < lineCount; i += 1) lines.set(pick(random, products).id, 1 + Math.floor(random() * 3));

    const discount = random() < 0.12 ? { type: 'percent', value: 10 } : undefined;
    let saleId;
    try {
      const sale = await saleController.create({
        items: [...lines].map(([productId, quantity]) => ({ productId, quantity })),
        customerId: random() < 0.4 ? pick(random, customers).id : undefined,
        paymentMethod: pick(random, methods),
        discount,
        userId,
      });
      saleId = sale.id ?? sale;
    } catch {
      continue; // sin stock para esa combinación: se salta esa venta
    }
    created.push({ saleId, at });
  }

  for (const { saleId, at } of created) {
    const date = dbDate(at);
    const params = { replacements: { date, saleId }, type: QueryTypes.UPDATE };
    await sequelize.query('UPDATE sales SET created_at = :date, updated_at = :date WHERE id = :saleId', params);
    await sequelize.query('UPDATE sale_items SET created_at = :date, updated_at = :date WHERE sale_id = :saleId', params);
    await sequelize.query('UPDATE stock_movements SET created_at = :date, updated_at = :date WHERE sale_id = :saleId', params);
  }

  // Una venta anulada de hace unos días, para mostrar cómo se ve (devuelve el stock).
  if (created.length > 10) await saleController.voidSale(created[created.length - 10].saleId, { reason: 'Error de carga', userId });
  return created.length;
}

// El stock inicial "ocurrió" al comienzo del período, antes de la primera venta.
async function backdateInitialStock(now) {
  const start = dbDate(new Date(now.getTime() - DAYS_OF_HISTORY * DAY_MS));
  await sequelize.query('UPDATE stock_movements SET created_at = :start, updated_at = :start', {
    replacements: { start },
    type: QueryTypes.UPDATE,
  });
}

/**
 * Deja una base recién migrada lista para mostrar: usuario de prueba, catálogo, ventas de las últimas dos
 * semanas, dos productos con stock bajo y el nombre del comercio. No hace nada si ya hay usuarios.
 */
async function populateDemo({ now = new Date() } = {}) {
  if ((await User.count()) > 0) return null;

  const user = await authController.createUser(DEMO_USER);
  const catalog = await loadCatalog({ userId: user.id, stockFactor: 6 });
  await backdateInitialStock(now);
  const sales = await loadSales({ userId: user.id, now });

  // Conteo de stock de hoy: deja dos productos por debajo del mínimo (aparecen en Reportes e Inicio).
  for (const [code, newStock] of [['LAC001', 3], ['GOL002', 2]]) {
    const product = await Product.findOne({ where: { code } });
    if (product && product.stock !== newStock) {
      await applyMovement({ productId: product.id, type: 'adjustment', newStock, reason: 'Conteo de stock', userId: user.id });
    }
  }

  const [settings] = await BusinessSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, name: 'Comercio de ejemplo' } });
  await settings.update({ name: 'Comercio de ejemplo' });

  return { ...catalog, sales, user: DEMO_USER.username };
}

module.exports = { DEMO_USER, loadCatalog, loadSales, populateDemo };
