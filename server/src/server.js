// Arranque del servidor: aplica las migraciones pendientes y recién después empieza a escuchar.
// Lo usan tanto `npm start` (index.js) como la app de escritorio.
const app = require('./app');
const { sequelize } = require('./db');
const { createBackup, rotateBackups } = require('./utils/backupTools');
const { migrateUp } = require('./utils/migrator');

const KEEP_BACKUPS = Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

// Si la base ya tenía datos y hay cambios de esquema por aplicar (una actualización de la app),
// primero se hace un backup: si algo sale mal, se puede volver atrás.
async function prepareDatabase() {
  // WAL: se puede leer mientras se escribe y la base es más resistente a cortes de luz. Queda guardado en el archivo.
  await sequelize.query('PRAGMA journal_mode = WAL');

  const applied = await migrateUp(sequelize, {
    beforeMigrate: async (pending, alreadyApplied) => {
      if (alreadyApplied.length === 0) return; // base nueva: no hay nada que resguardar
      const file = await createBackup(sequelize, 'antes-de-migrar');
      rotateBackups(KEEP_BACKUPS);
      console.log(`Backup previo a migrar: ${file}`);
    },
  });
  if (applied.length > 0) console.log(`Migraciones aplicadas: ${applied.join(', ')}`);
  return applied;
}

// Devuelve el servidor HTTP ya escuchando. `host` vacío = todas las interfaces (desarrollo);
// la app de escritorio usa 127.0.0.1 para que solo se pueda acceder desde la propia PC.
async function startServer({ port = 3001, host } = {}) {
  await sequelize.authenticate();
  await prepareDatabase();
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      server.removeListener('error', reject);
      // Una vez escuchando, un error del servidor HTTP se registra (no se puede tragar en silencio).
      server.on('error', (error) => console.error('Error del servidor HTTP:', error));
      resolve(server);
    });
    server.once('error', reject);
  });
}

module.exports = { startServer, prepareDatabase };
