// Uso: npm run backup
// Genera una copia comprimida de toda la base en server/backups (o en BACKUP_DIR) y conserva las últimas BACKUP_KEEP.
require('dotenv').config();
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { backupDir, connection, findPostgresTool, formatSize, listBackups, timestamp } = require('../utils/postgresTools');

const KEEP = Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

// Hace el backup y devuelve la ruta del archivo. `label` se agrega al nombre (ej. "antes-de-restaurar").
function createBackup(label = '') {
  const { args, env, dbName } = connection();
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });

  const suffix = label ? `_${label}` : '';
  const file = path.join(dir, `${dbName}_${timestamp()}${suffix}.dump`);

  // -Fc = formato comprimido de PostgreSQL (se restaura con pg_restore)
  const result = spawnSync(findPostgresTool('pg_dump'), [...args, '-Fc', '--no-owner', '-f', file], { env, encoding: 'utf8' });
  if (result.status !== 0) {
    fs.rmSync(file, { force: true }); // no dejar un archivo a medias
    throw new Error(result.stderr?.trim() || 'pg_dump falló');
  }
  return file;
}

// Borra los backups más viejos y deja solo los últimos KEEP.
function rotate() {
  const { dbName } = connection();
  const old = listBackups(backupDir(), dbName).slice(KEEP);
  old.forEach((backup) => fs.rmSync(backup.path, { force: true }));
  return old.length;
}

if (require.main === module) {
  try {
    const file = createBackup();
    const removed = rotate();
    console.log(`Backup listo: ${file} (${formatSize(fs.statSync(file).size)})`);
    if (removed > 0) console.log(`Se borraron ${removed} backup(s) viejos (se conservan los últimos ${KEEP}).`);
  } catch (error) {
    console.error('No se pudo hacer el backup:', error.message);
    process.exitCode = 1;
  }
}

module.exports = { createBackup, rotate };
