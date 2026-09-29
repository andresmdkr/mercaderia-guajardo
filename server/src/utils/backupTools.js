// Backups de la base SQLite: una copia consistente en un solo archivo (VACUUM INTO), que se puede
// hacer con la aplicación en uso. Restaurar = reemplazar el archivo de la base (ver scripts/restore.js).
const fs = require('node:fs');
const path = require('node:path');

const PREFIX = 'mercaderia';
const EXTENSION = '.sqlite';
const SQLITE_HEADER = 'SQLite format 3\0';

// Carpeta de backups: BACKUP_DIR (la app de escritorio la define; puede ser un pendrive o Dropbox) o server/backups.
const backupDir = () => path.resolve(process.env.BACKUP_DIR ?? path.join(__dirname, '..', '..', 'backups'));

// Marca de tiempo local para nombres de archivo: 2026-09-28_21-54-03
function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// Lista los backups, del más nuevo al más viejo.
function listBackups(dir = backupDir()) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.startsWith(`${PREFIX}_`) && file.endsWith(EXTENSION))
    .sort()
    .reverse()
    .map((file) => ({ file, path: path.join(dir, file), size: fs.statSync(path.join(dir, file)).size }));
}

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Copia consistente de la base en uso. `label` se agrega al nombre (ej. "antes-de-restaurar").
async function createBackup(sequelize, label = '') {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${PREFIX}_${timestamp()}${label ? `_${label}` : ''}${EXTENSION}`);
  await sequelize.query('VACUUM INTO :file', { replacements: { file } });
  return file;
}

// Borra los backups más viejos y deja solo los últimos `keep`. Devuelve cuántos borró.
function rotateBackups(keep) {
  const old = listBackups().slice(keep);
  old.forEach((backup) => fs.rmSync(backup.path, { force: true }));
  return old.length;
}

// ¿El archivo empieza con la firma de una base SQLite? (evita "restaurar" cualquier otra cosa)
function looksLikeSqlite(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(SQLITE_HEADER.length);
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.toString('latin1') === SQLITE_HEADER;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { backupDir, timestamp, listBackups, formatSize, createBackup, rotateBackups, looksLikeSqlite };
