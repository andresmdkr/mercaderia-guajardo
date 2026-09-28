// Uso: npm run seed
// Carga datos de ejemplo para probar la app. Solo desarrollo; se puede correr varias veces.
const { sequelize, Category, Customer, Product, StockMovement, User } = require('../db');
const { applyMovement } = require('../controllers/stockController');

if (process.env.NODE_ENV === 'production') {
  console.error('El seed no se puede correr en producción');
  process.exit(1);
}

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

async function main() {
  const categoryIds = {};
  for (const name of CATEGORIES) {
    const [category] = await Category.findOrCreate({ where: { name }, defaults: { name } });
    categoryIds[name] = category.id;
  }

  let created = 0;
  for (const [code, name, category, costPrice, salePrice, minStock] of PRODUCTS) {
    const [, isNew] = await Product.findOrCreate({
      where: { code },
      defaults: { code, name, costPrice, salePrice, minStock, categoryId: categoryIds[category] },
    });
    if (isNew) created += 1;
  }

  // El stock se carga como movimientos (nunca se escribe directo). Solo a productos sin historial.
  let stocked = 0;
  const user = await User.findOne({ order: [['id', 'ASC']] });
  if (!user) {
    console.log('No hay usuarios: se omite el stock inicial (creá uno con npm run create-user y volvé a correr el seed)');
  } else {
    for (const [code, quantity] of Object.entries(INITIAL_STOCK)) {
      const product = await Product.findOne({ where: { code } });
      if (!product || (await StockMovement.count({ where: { productId: product.id } })) > 0) continue;
      await applyMovement({
        productId: product.id,
        type: 'in',
        quantity,
        reason: 'Stock inicial (datos de ejemplo)',
        userId: user.id,
      });
      stocked += 1;
    }
  }

  let customersCreated = 0;
  for (const [name, phone, email, address, notes] of CUSTOMERS) {
    const [, isNew] = await Customer.findOrCreate({ where: { name }, defaults: { name, phone, email, address, notes } });
    if (isNew) customersCreated += 1;
  }

  console.log(
    `Seed listo: ${CATEGORIES.length} categorías, ${created} productos nuevos, ${stocked} con stock inicial, ${customersCreated} clientes nuevos`
  );
}

main()
  .catch((error) => {
    console.error('Falló el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
