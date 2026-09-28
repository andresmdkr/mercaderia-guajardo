// Uso: npm run seed
// Carga datos de ejemplo para probar la app. Solo desarrollo; se puede correr varias veces.
const { sequelize, Category, Product } = require('../db');

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

  console.log(`Seed listo: ${CATEGORIES.length} categorías, ${created} productos nuevos`);
}

main()
  .catch((error) => {
    console.error('Falló el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
