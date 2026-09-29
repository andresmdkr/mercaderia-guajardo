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

const CATEGORIES = ['Almacén', 'Bebidas', 'Limpieza', 'Lácteos', 'Golosinas', 'Galletitas'];

// Productos conocidos en San Juan y en toda la Argentina, con su marca (son solo de ejemplo; precios aproximados).
// [código, nombre, categoría, costo, venta, stock mínimo]
const PRODUCTS = [
  ['ALM001', 'Yerba mate Taragüí 1kg', 'Almacén', 5200, 7200, 6],
  ['ALM002', 'Yerba mate Playadito 1kg', 'Almacén', 5000, 6900, 6],
  ['ALM003', 'Fideos Matarazzo tirabuzón 500g', 'Almacén', 1100, 1650, 10],
  ['ALM004', 'Fideos Lucchetti spaghetti 500g', 'Almacén', 1050, 1600, 10],
  ['ALM005', 'Arroz Gallo Oro 1kg', 'Almacén', 1500, 2200, 8],
  ['ALM006', 'Aceite Cocinero girasol 900ml', 'Almacén', 2600, 3700, 6],
  ['ALM007', 'Azúcar Ledesma 1kg', 'Almacén', 1200, 1800, 8],
  ['ALM008', 'Harina Pureza 000 1kg', 'Almacén', 800, 1250, 8],
  ['ALM009', 'Sal Celusal fina 500g', 'Almacén', 500, 800, 6],
  ['ALM010', 'Puré de tomate Arcor 520g', 'Almacén', 700, 1100, 8],
  ['ALM011', 'Mate cocido Taragüí x25', 'Almacén', 1000, 1500, 6],
  ['ALM012', 'Café La Morenita 250g', 'Almacén', 3300, 4700, 4],
  ['BEB001', 'Coca-Cola 2,25L', 'Bebidas', 2600, 3700, 8],
  ['BEB002', 'Sprite 2,25L', 'Bebidas', 2400, 3400, 6],
  ['BEB003', 'Fanta naranja 2,25L', 'Bebidas', 2400, 3400, 6],
  ['BEB004', 'Agua Villavicencio 1,5L', 'Bebidas', 900, 1400, 12],
  ['BEB005', 'Cerveza Quilmes lata 473ml', 'Bebidas', 1500, 2200, 12],
  ['BEB006', 'Cerveza Andes Origen lata 473ml', 'Bebidas', 1500, 2200, 12],
  ['BEB007', 'Vino Termidor 1L', 'Bebidas', 2000, 2900, 6],
  ['BEB008', 'Fernet Branca 750ml', 'Bebidas', 11000, 15500, 4],
  ['BEB009', 'Jugo Cepita naranja 1L', 'Bebidas', 1300, 1900, 6],
  ['LIM001', 'Lavandina Ayudín 1L', 'Limpieza', 800, 1250, 6],
  ['LIM002', 'Detergente Magistral limón 750ml', 'Limpieza', 1600, 2400, 6],
  ['LIM003', 'Papel higiénico Higienol x4', 'Limpieza', 1800, 2700, 8],
  ['LIM004', 'Jabón en polvo Skip 800g', 'Limpieza', 3600, 5200, 4],
  ['LIM005', 'Suavizante Vívere 900ml', 'Limpieza', 2200, 3200, 4],
  ['LAC001', 'Leche La Serenísima entera 1L', 'Lácteos', 1200, 1750, 10],
  ['LAC002', 'Yogur Ser bebible frutilla 1L', 'Lácteos', 1600, 2300, 6],
  ['LAC003', 'Manteca La Serenísima 200g', 'Lácteos', 2100, 3000, 4],
  ['LAC004', 'Queso crema Casancrem 300g', 'Lácteos', 2400, 3400, 4],
  ['LAC005', 'Dulce de leche La Serenísima 400g', 'Lácteos', 2200, 3200, 4],
  ['GOL001', 'Alfajor Jorgito triple', 'Golosinas', 700, 1100, 15],
  ['GOL002', 'Alfajor Guaymallén', 'Golosinas', 400, 700, 20],
  ['GOL003', 'Chocolate Milka Oreo 100g', 'Golosinas', 1900, 2800, 8],
  ['GOL004', 'Bon o Bon', 'Golosinas', 300, 500, 20],
  ['GAL001', 'Galletitas Oreo 118g', 'Galletitas', 1100, 1650, 10],
  ['GAL002', 'Galletitas Criollitas 300g', 'Galletitas', 1300, 1900, 8],
  ['GAL003', 'Galletitas Terrabusi Variedad 400g', 'Galletitas', 1900, 2800, 6],
];

// Stock inicial por código. Varios quedan en o bajo el mínimo, para probar "stock bajo".
const INITIAL_STOCK = {
  ALM001: 4, ALM002: 12, ALM003: 24, ALM004: 20, ALM005: 15, ALM006: 9, ALM007: 20, ALM008: 16, ALM009: 12, ALM010: 14, ALM011: 10, ALM012: 6,
  BEB001: 16, BEB002: 12, BEB003: 10, BEB004: 24, BEB005: 30, BEB006: 30, BEB007: 12, BEB008: 5, BEB009: 10,
  LIM001: 10, LIM002: 8, LIM003: 12, LIM004: 5, LIM005: 6,
  LAC001: 14, LAC002: 10, LAC003: 6, LAC004: 6, LAC005: 8,
  GOL001: 40, GOL002: 50, GOL003: 14, GOL004: 60,
  GAL001: 18, GAL002: 12, GAL003: 10,
};

// Clientes de San Juan (todo inventado). El primero es el de la demostración y el más frecuente en las ventas.
// [nombre, teléfono, email, dirección, notas]
const CUSTOMERS = [
  ['Andrés Márquez', '264 458-1305', 'andres.marquez@example.com', 'Av. Libertador 1450 Oeste, Capital', 'Cliente frecuente'],
  ['Laura Quiroga', '264 512-3344', null, 'Calle Laprida 812 Este, Capital', 'Paga los viernes'],
  ['Marcelo Ortiz', '264 601-9087', 'marcelo.ortiz@example.com', 'Av. Ignacio de la Roza 245 Oeste, Capital', null],
  ['Carolina Sarmiento', '264 433-7721', null, 'Calle Mendoza 1120 Sur, Rivadavia', 'Prefiere transferencia'],
  ['Facundo Videla', '264 579-1102', null, 'Calle Rawson 330, Chimbas', null],
  ['Silvina Castro', '264 410-6653', 'silvina.castro@example.com', 'Barrio Rawson, manzana C casa 12, Rawson', null],
  ['Roberto Molina', '264 655-2038', null, 'Ruta 40 km 3, Pocito', 'Retira por el local'],
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
        // El primer cliente (Andrés Márquez) compra más seguido que los demás
        customerId: random() < 0.4 ? (random() < 0.35 ? customers[0] : pick(random, customers)).id : undefined,
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

  const [settings] = await BusinessSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, name: 'Almacén El Zonda' } });
  await settings.update({
    name: 'Almacén El Zonda',
    address: 'Av. Libertador 1234 Oeste, San Juan',
    phone: '264 422-1234',
    email: 'contacto@elzonda.example.com',
  });

  return { ...catalog, sales, user: DEMO_USER.username };
}

module.exports = { DEMO_USER, loadCatalog, loadSales, populateDemo };
