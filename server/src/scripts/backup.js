// Uso: npm run backup
// Genera una copia de toda la base en server/backups (o en BACKUP_DIR) y conserva las últimas BACKUP_KEEP.
// Se puede hacer con la aplicación abierta.
require('dotenv').config();
const fs = require('node:fs');
const { sequelize } = require('../db');
const { createBackup, formatSize, rotateBackups } = require('../utils/backupTools');

const KEEP = Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

async function main() {
  const file = await createBackup(sequelize);
  const removed = rotateBackups(KEEP);
  console.log(`Backup listo: ${file} (${formatSize(fs.statSync(file).size)})`);
  if (removed > 0) console.log(`Se borraron ${removed} backup(s) viejos (se conservan los últimos ${KEEP}).`);
}

main()
  .catch((error) => {
    console.error('No se pudo hacer el backup:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
