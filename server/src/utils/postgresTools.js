// Helpers para los scripts de backup y restauración (usan las herramientas de PostgreSQL).
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const isWindows = process.platform === 'win32';

// Busca un ejecutable de PostgreSQL (pg_dump, pg_restore): primero PG_BIN_DIR, después el PATH
// y, en Windows, la carpeta de instalación por defecto (la versión más nueva).
function findPostgresTool(name) {
  const exe = isWindows ? `${name}.exe` : name;

  if (process.env.PG_BIN_DIR) {
    const fromEnv = path.join(process.env.PG_BIN_DIR, exe);
    if (fs.existsSync(fromEnv)) return fromEnv;
  }

  if (spawnSync(name, ['--version'], { encoding: 'utf8' }).status === 0) return name;

  if (isWindows) {
    const root = path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'PostgreSQL');
    if (fs.existsSync(root)) {
      const versions = fs
        .readdirSync(root)
        .filter((dir) => /^\d+/.test(dir))
        .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
      for (const version of versions) {
        const candidate = path.join(root, version, 'bin', exe);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  throw new Error(
    `No se encontró "${name}". Instalá PostgreSQL o indicá la carpeta con las herramientas en PG_BIN_DIR (server/.env).`
  );
}

// Carpeta de backups: BACKUP_DIR en server/.env (por ejemplo una carpeta de Dropbox o un pendrive) o server/backups.
const backupDir = () => path.resolve(process.env.BACKUP_DIR ?? path.join(__dirname, '..', '..', 'backups'));

// Marca de tiempo local para nombres de archivo: 2026-09-28_21-54-03
function timestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// Argumentos de conexión. La contraseña va por variable de entorno (PGPASSWORD), no por la línea de comandos.
function connection() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  return {
    args: ['-h', DB_HOST, '-p', String(DB_PORT), '-U', DB_USER, '-d', DB_NAME],
    env: { ...process.env, PGPASSWORD: DB_PASSWORD },
    dbName: DB_NAME,
  };
}

// Lista los backups de la base, del más nuevo al más viejo.
function listBackups(dir, dbName) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.startsWith(`${dbName}_`) && file.endsWith('.dump'))
    .sort()
    .reverse()
    .map((file) => ({ file, path: path.join(dir, file), size: fs.statSync(path.join(dir, file)).size }));
}

const formatSize = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

module.exports = { findPostgresTool, backupDir, timestamp, connection, listBackups, formatSize };
