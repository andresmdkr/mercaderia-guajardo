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

// mercaderia_2026-09-29_21-54-03[_etiqueta].sqlite  → sin etiqueta = hecho a mano
const BACKUP_NAME = /^mercaderia_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}(?:_([a-z-]+))?\.sqlite$/;

// Nombre de archivo de backup válido (evita rutas raras cuando el nombre viene de la pantalla).
const isValidBackupName = (name) => typeof name === 'string' && BACKUP_NAME.test(name);

// Tipo de backup según la etiqueta del nombre: manual, automatico, antes-de-migrar, antes-de-restaurar.
const backupKind = (file) => BACKUP_NAME.exec(file)?.[1] ?? 'manual';

// Lista los backups, del más nuevo al más viejo.
function listBackups(dir = backupDir()) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => isValidBackupName(file))
    .sort()
    .reverse()
    .map((file) => {
      const stat = fs.statSync(path.join(dir, file));
      return { file, path: path.join(dir, file), size: stat.size, createdAt: stat.mtime, kind: backupKind(file) };
    });
}

const formatSize = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Las copias se hacen de a una: dos pedidos simultáneos (doble clic) no pueden elegir el mismo nombre de archivo.
let backupQueue = Promise.resolve();
function createBackup(sequelize, label = '') {
  const result = backupQueue.then(() => createBackupNow(sequelize, label));
  backupQueue = result.catch(() => {});
  return result;
}

// Copia consistente de la base en uso. `label` se agrega al nombre (ej. "antes-de-restaurar").
async function createBackupNow(sequelize, label) {
  const dir = backupDir();
  fs.mkdirSync(dir, { recursive: true });
  // El nombre lleva los segundos: si ya hay una copia de este mismo segundo (dos clics seguidos), se espera al
  // siguiente en vez de fallar (VACUUM INTO no pisa archivos que ya existen).
  const nameFor = () => path.join(dir, `${PREFIX}_${timestamp()}${label ? `_${label}` : ''}${EXTENSION}`);
  let file = nameFor();
  while (fs.existsSync(file)) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    file = nameFor();
  }
  await sequelize.query('VACUUM INTO :file', { replacements: { file } });
  // Si hay una carpeta externa configurada, la copia también va para allá (nunca falla la copia local por eso).
  await require('./externalBackup').copyToExternal(file); // require acá adentro: externalBackup usa este módulo
  return file;
}

// Borra los backups más viejos y deja solo los últimos `keep`. Devuelve cuántos borró.
function rotateBackups(keep) {
  const old = listBackups().slice(keep);
  old.forEach((backup) => fs.rmSync(backup.path, { force: true }));
  return old.length;
}

// Backup automático: si el último backup (de cualquier tipo) tiene más de `maxAgeHours` horas, hace uno nuevo.
// Devuelve la ruta del backup creado, o null si todavía no tocaba.
async function backupIfDue(sequelize, { maxAgeHours = 20, keep = 30 } = {}) {
  const newest = listBackups()[0];
  if (newest && Date.now() - newest.createdAt.getTime() < maxAgeHours * 60 * 60 * 1000) return null;
  const file = await createBackup(sequelize, 'automatico');
  rotateBackups(keep);
  return file;
}

// Abre el backup en modo solo lectura y comprueba que la base esté sana y tenga las tablas del negocio.
function checkBackupFile(file) {
  const sqlite3 = require('sqlite3');
  if (!looksLikeSqlite(file)) {
    return Promise.reject(new Error('El archivo no es un backup válido (no es una base SQLite; ¿es un .dump viejo de PostgreSQL?)'));
  }
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(new Error(`No se pudo abrir el backup: ${openError.message}`));
      db.get('PRAGMA integrity_check', (error, row) => {
        if (error || row.integrity_check !== 'ok') {
          db.close();
          return reject(new Error('El backup está dañado (falló la verificación de integridad)'));
        }
        db.get("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('products', 'sales', 'users')", (error2, tables) => {
          db.close();
          if (error2 || tables.n !== 3) return reject(new Error('El archivo es una base SQLite, pero no es de esta aplicación'));
          resolve();
        });
      });
    });
  });
}

// Reemplaza el archivo de la base por el backup. La base tiene que estar CERRADA (sin conexiones abiertas).
// Se copia a un archivo temporal y recién después se reemplaza: nunca queda una base a medias.
function replaceDatabaseFile(dbFile, backupFile) {
  const temp = `${dbFile}.restaurando`;
  fs.copyFileSync(backupFile, temp);
  for (const extra of ['-wal', '-shm']) fs.rmSync(`${dbFile}${extra}`, { force: true });
  fs.renameSync(temp, dbFile);
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

module.exports = {
  backupDir,
  timestamp,
  listBackups,
  isValidBackupName,
  backupKind,
  formatSize,
  createBackup,
  rotateBackups,
  backupIfDue,
  checkBackupFile,
  replaceDatabaseFile,
  looksLikeSqlite,
};
