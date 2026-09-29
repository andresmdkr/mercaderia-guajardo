// Uso: npm run migrate            → aplica las migraciones pendientes
//      npm run migrate:undo       → deshace la última migración
//      npm run migrate -- status  → muestra cuáles están aplicadas y cuáles faltan
// (El servidor también aplica las pendientes solo, al arrancar.)
require('dotenv').config();
const { DB_FILE, sequelize } = require('../db');
const { appliedMigrations, migrateDown, migrateUp, pendingMigrations } = require('../utils/migrator');

async function main() {
  const command = process.argv[2] ?? 'up';
  console.log(`Base de datos: ${DB_FILE}`);

  if (command === 'up') {
    const applied = await migrateUp(sequelize);
    console.log(applied.length ? `Aplicadas: ${applied.join(', ')}` : 'No hay migraciones pendientes.');
  } else if (command === 'down') {
    const reverted = await migrateDown(sequelize);
    console.log(reverted ? `Deshecha: ${reverted}` : 'No hay migraciones para deshacer.');
  } else if (command === 'status') {
    console.log('Aplicadas:', (await appliedMigrations(sequelize)).join(', ') || '(ninguna)');
    console.log('Pendientes:', (await pendingMigrations(sequelize)).join(', ') || '(ninguna)');
  } else {
    throw new Error(`Comando desconocido "${command}" (usar up, down o status)`);
  }
}

main()
  .catch((error) => {
    console.error('Falló la migración:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
