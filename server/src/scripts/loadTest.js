// Uso: npm run load-test [-- --products 3000 --sales 30000 --months 18 --customers 400]
// Genera una copia de seguridad (archivo .sqlite) con muchísimos datos de ejemplo para probar la velocidad de la app:
// productos, clientes, ventas con varios ítems (algunas anuladas) y todos los movimientos de stock.
// No toca tu base: escribe un archivo nuevo en la carpeta de backups. Para usarlo en la app de escritorio, copialo a
// %APPDATA%\Mercadería Guajardo\Copias de seguridad y restauralo desde Configuración.
// Usuario del archivo: demo / demo1234. Los datos son siempre los mismos (generador con semilla fija).
const path = require('node:path');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? Number.parseInt(args[index + 1], 10) : fallback;
};
const PRODUCTS = option('products', 3000);
const SALES = option('sales', 30000);
const MONTHS = option('months', 18);
const CUSTOMERS = option('customers', 400);

// El archivo se crea con nombre de backup, para que la pantalla de Configuración lo reconozca.
const { backupDir, timestamp } = require('../utils/backupTools');
process.env.DB_FILE = path.join(backupDir(), `mercaderia_${timestamp()}_carga-de-prueba.sqlite`);

const bcrypt = require('bcryptjs');
const { sequelize, DB_FILE } = require('../db');
const { migrateUp } = require('../utils/migrator');

// Generador pseudoaleatorio con semilla: siempre produce los mismos datos.
let seed = 20260929;
function random() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min, max) => min + Math.floor(random() * (max - min + 1));
const pick = (list) => list[Math.floor(random() * list.length)];

const CATEGORIES = ['Almacén', 'Bebidas', 'Limpieza', 'Lácteos', 'Golosinas', 'Fiambres', 'Panadería', 'Perfumería', 'Congelados', 'Verdulería',
  'Mascotas', 'Librería', 'Bazar', 'Ferretería', 'Snacks', 'Infusiones', 'Conservas', 'Aderezos', 'Harinas', 'Cuidado personal'];
const ITEMS = ['Yerba mate', 'Fideos', 'Arroz', 'Aceite', 'Azúcar', 'Harina', 'Gaseosa', 'Agua mineral', 'Cerveza', 'Vino tinto', 'Lavandina', 'Detergente',
  'Jabón en polvo', 'Papel higiénico', 'Leche', 'Yogur', 'Queso cremoso', 'Manteca', 'Alfajor', 'Chocolate', 'Galletitas', 'Jamón cocido', 'Salame',
  'Pan lactal', 'Shampoo', 'Desodorante', 'Hamburguesas', 'Papas fritas', 'Alimento perro', 'Cuaderno', 'Lapicera', 'Tomate triturado', 'Atún', 'Mayonesa',
  'Café molido', 'Té en saquitos', 'Mermelada', 'Dulce de leche', 'Cacao', 'Sal fina'];
const BRANDS = ['Campo Verde', 'La Serenísima', 'Del Sur', 'Don Manuel', 'Santa Rosa', 'El Abuelo', 'Sol de Mayo', 'Río Claro', 'La Pampa', 'Mi Barrio', 'Norteña', 'Delicias', 'Buen Día'];
const SIZES = ['250g', '500g', '1kg', '2kg', '750ml', '1L', '1,5L', '2,25L', 'x6', 'x12', 'x24', 'chico', 'grande', 'familiar'];
const FIRST = ['María', 'Juan', 'Lucía', 'Carlos', 'Ana', 'Pedro', 'Laura', 'Diego', 'Sofía', 'Martín', 'Valeria', 'Jorge', 'Camila', 'Nicolás', 'Paula', 'Andrés', 'Romina', 'Gustavo'];
const LAST = ['Pérez', 'Gómez', 'Fernández', 'Rodríguez', 'Martínez', 'López', 'García', 'Sánchez', 'Romero', 'Díaz', 'Álvarez', 'Torres', 'Ruiz', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Suárez'];

// Precios en centavos, redondeados a $10.
const cents = (pesos) => Math.round(pesos / 10) * 10 * 100;

function buildProducts(now) {
  const names = new Set();
  const products = [];
  while (products.length < PRODUCTS) {
    const name = `${pick(ITEMS)} ${pick(BRANDS)} ${pick(SIZES)}`;
    if (names.has(name)) continue;
    names.add(name);
    const cost = cents(int(300, 20000));
    products.push({
      code: `P${String(products.length + 1).padStart(5, '0')}`,
      name,
      category_id: int(1, CATEGORIES.length),
      cost_price: cost,
      sale_price: Math.round((cost * (1.25 + random() * 0.6)) / 1000) * 1000 || 1000,
      min_stock: pick([0, 3, 5, 5, 10]),
      active: random() < 0.97 ? 1 : 0,
      stock: 0,
      created_at: now,
      updated_at: now,
      popularity: Math.pow(random(), 3), // pocos productos se venden mucho, la mayoría poco
    });
  }
  return products;
}

async function insert(table, rows) {
  const queryInterface = sequelize.getQueryInterface();
  for (let start = 0; start < rows.length; start += 400) {
    await queryInterface.bulkInsert(table, rows.slice(start, start + 400));
  }
}

async function main() {
  const started = Date.now();
  await sequelize.authenticate();
  await migrateUp(sequelize);
  const end = new Date();
  const begin = new Date(end.getTime() - MONTHS * 30 * 24 * 3600 * 1000);

  await insert('users', [{ username: 'demo', name: 'Usuario de prueba', password_hash: await bcrypt.hash('demo1234', 10), created_at: begin, updated_at: begin }]);
  await insert('categories', CATEGORIES.map((name) => ({ name, created_at: begin, updated_at: begin })));
  await insert('customers', Array.from({ length: CUSTOMERS }, (_, i) => ({
    name: `${pick(FIRST)} ${pick(LAST)} ${i + 1}`,
    phone: random() < 0.7 ? `11 ${int(4000, 6999)}-${int(1000, 9999)}` : null,
    email: null, address: null, notes: null, active: 1, created_at: begin, updated_at: begin,
  })));

  const products = buildProducts(begin);
  const movements = [];
  const sales = [];
  const saleItems = [];

  // Todo se simula en orden cronológico y en memoria; recién al final se escribe a la base.
  const move = (product, type, quantity, when, reason, saleId = null) => {
    const before = product.stock;
    product.stock += quantity;
    movements.push({ product_id: product.id, user_id: 1, sale_id: saleId, type, quantity, stock_before: before, stock_after: product.stock, reason, created_at: when, updated_at: when });
  };

  products.forEach((product, index) => {
    product.id = index + 1;
    move(product, 'in', int(20, 200), begin, 'Stock inicial');
  });
  const sellable = products.filter((product) => product.active);
  const popularity = sellable.reduce((acc, p) => [...acc, (acc[acc.length - 1] ?? 0) + p.popularity + 0.01], []);
  const pickProduct = () => {
    const target = random() * popularity[popularity.length - 1];
    let low = 0;
    let high = popularity.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (popularity[mid] < target) low = mid + 1;
      else high = mid;
    }
    return sellable[low];
  };

  const totalMs = end.getTime() - begin.getTime();
  const times = Array.from({ length: SALES }, () => begin.getTime() + 60000 + random() * (totalMs - 120000)).sort((a, b) => a - b);
  const PAYMENTS = ['cash', 'cash', 'cash', 'transfer', 'card'];

  times.forEach((time, index) => {
    const saleId = index + 1;
    const when = new Date(time);
    const chosen = new Map();
    const lines = int(1, 6);
    for (let i = 0; i < lines * 3 && chosen.size < lines; i += 1) {
      const product = pickProduct();
      chosen.set(product.id, { product, quantity: pick([1, 1, 1, 2, 2, 3, 6]) });
    }
    const ordered = [...chosen.values()].sort((a, b) => a.product.id - b.product.id);
    // Compra de mercadería si no alcanza el stock (queda como entrada, unos minutos antes de la venta).
    for (const { product, quantity } of ordered) {
      if (product.stock < quantity) move(product, 'in', int(50, 300), new Date(time - 5 * 60000), 'Compra a proveedor');
    }
    let subtotal = 0;
    for (const { product, quantity } of ordered) {
      const lineTotal = quantity * product.sale_price;
      subtotal += lineTotal;
      saleItems.push({ sale_id: saleId, product_id: product.id, product_code: product.code, product_name: product.name, quantity, unit_price: product.sale_price, unit_cost: product.cost_price, line_total: lineTotal, created_at: when, updated_at: when });
      move(product, 'sale', -quantity, when, null, saleId);
    }
    const percent = random() < 0.08;
    const discount = percent ? Math.round((subtotal * 10) / 100) : 0;
    const voided = random() < 0.01;
    sales.push({
      customer_id: random() < 0.3 ? int(1, CUSTOMERS) : null, user_id: 1, payment_method: pick(PAYMENTS), subtotal,
      discount_type: percent ? 'percent' : null, discount_value: percent ? 1000 : null, discount_amount: discount, total: subtotal - discount,
      notes: null, status: voided ? 'voided' : 'completed', voided_at: voided ? new Date(time + 3600000) : null, voided_by: voided ? 1 : null,
      void_reason: voided ? 'Error al cargar' : null, created_at: when, updated_at: when,
    });
    if (voided) {
      const voidTime = new Date(time + 3600000);
      for (const { product, quantity } of ordered) move(product, 'sale_void', quantity, voidTime, 'Anulación de venta', saleId);
    }
    // De vez en cuando, un ajuste por conteo o una salida por rotura.
    if (random() < 0.01) {
      const product = pick(sellable);
      if (product.stock > 2) move(product, random() < 0.5 ? 'out' : 'adjustment', -1, new Date(time + 1000), 'Rotura / ajuste por conteo');
    }
  });

  // Las tablas se llenan en este orden por las claves foráneas; los movimientos van por fecha.
  movements.sort((a, b) => a.created_at - b.created_at);
  const cleanProducts = products.map((product) => {
    const row = { ...product };
    delete row.popularity;
    return row;
  });
  await sequelize.query('PRAGMA synchronous = OFF'); // es un archivo nuevo: si se corta, se genera de nuevo
  await insert('products', cleanProducts); // con el stock final que dejó la simulación
  await insert('sales', sales);
  await insert('sale_items', saleItems);
  await insert('stock_movements', movements);

  await sequelize.query('PRAGMA wal_checkpoint(TRUNCATE)');
  await sequelize.query('PRAGMA journal_mode = DELETE');
  await sequelize.close();

  const size = (require('node:fs').statSync(DB_FILE).size / 1024 / 1024).toFixed(1);
  console.log(`Listo en ${((Date.now() - started) / 1000).toFixed(1)} s (${size} MB): ${DB_FILE}`);
  console.log(`  ${PRODUCTS} productos · ${CUSTOMERS} clientes · ${SALES} ventas (${saleItems.length} ítems) · ${movements.length} movimientos de stock`);
  console.log('  Usuario: demo / demo1234');
}

main().catch((error) => {
  console.error('No se pudo generar:', error);
  process.exit(1);
});
