// Uso: npm run seed
// Carga datos de ejemplo para probar la app. Solo desarrollo; se puede correr varias veces.
// (Los datos son los mismos del modo de prueba de la app de escritorio: ver utils/demoData.js.)
const { sequelize, User } = require('../db');
const { loadCatalog } = require('../utils/demoData');
const { migrateUp } = require('../utils/migrator');

if (process.env.NODE_ENV === 'production') {
  console.error('El seed no se puede correr en producción');
  process.exit(1);
}

async function main() {
  await migrateUp(sequelize); // con una base nueva, primero se crea el esquema

  // El stock se carga como movimientos (nunca se escribe directo), y un movimiento necesita un usuario.
  const user = await User.findOne({ order: [['id', 'ASC']] });
  if (!user) {
    console.log('No hay usuarios: se omite el stock inicial (creá uno con npm run create-user y volvé a correr el seed)');
  }

  const { categories, products, stocked, customers } = await loadCatalog({ userId: user?.id });
  console.log(`Seed listo: ${categories} categorías, ${products} productos nuevos, ${stocked} con stock inicial, ${customers} clientes nuevos`);
}

main()
  .catch((error) => {
    console.error('Falló el seed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
