'use strict';
// El servidor de la aplicación (Express + SQLite) corriendo dentro del propio programa, más las tareas
// que necesitan tocar la base: backup automático y restauración de una copia.

const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const HOST = '127.0.0.1'; // solo se puede entrar desde esta misma PC
// Puerto fijo (si está libre): el navegador guarda las preferencias (modo claro/oscuro) por dirección, con puerto incluido.
const PREFERRED_PORT = 38417;
const SERVER_SRC = path.join(__dirname, '..', 'app', 'server', 'src');
const CLIENT_DIST = path.join(__dirname, '..', 'app', 'client', 'dist');
const MIGRATIONS = path.join(__dirname, '..', 'app', 'server', 'migrations');

const state = { origin: null, dataDir: null, backupsDir: null, dbFile: null };

// La clave que firma las sesiones se inventa la primera vez y queda guardada junto a los datos.
function loadSecret(dataDir) {
  const file = path.join(dataDir, 'config.json');
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof saved.jwtSecret === 'string' && saved.jwtSecret.length >= 32) return saved.jwtSecret;
  } catch {
    // primera vez, o archivo ilegible: se crea uno nuevo (las sesiones abiertas se cierran, nada más)
  }
  const jwtSecret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, JSON.stringify({ jwtSecret }, null, 2));
  return jwtSecret;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, HOST, () => probe.close(() => resolve(true)));
  });
}

async function findPort() {
  for (let port = PREFERRED_PORT; port < PREFERRED_PORT + 10; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No hay ningún puerto libre entre ${PREFERRED_PORT} y ${PREFERRED_PORT + 9}`);
}

// Define la configuración (variables de entorno que lee el servidor) y arranca. Devuelve { origin, port }.
async function start({ dataDir, appVersion, log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const port = await findPort();

  state.dataDir = dataDir;
  state.dbFile = path.join(dataDir, 'mercaderia.sqlite');
  state.backupsDir = path.join(dataDir, 'Copias de seguridad');
  state.origin = `http://${HOST}:${port}`;

  Object.assign(process.env, {
    NODE_ENV: 'production',
    DB_FILE: state.dbFile,
    BACKUP_DIR: state.backupsDir,
    CLIENT_DIST,
    MIGRATIONS_DIR: MIGRATIONS,
    CLIENT_URL: state.origin,
    COOKIE_SECURE: 'false', // la conexión es local (http), una cookie "Secure" no viajaría
    APP_VERSION: appVersion,
    JWT_SECRET: loadSecret(dataDir),
  });

  const { startServer } = require(path.join(SERVER_SRC, 'server.js'));
  const server = await startServer({ port, host: HOST });
  log(`servidor local en ${state.origin} · base ${state.dbFile}`);

  // Una copia por día: al abrir la aplicación, si la última tiene más de 20 horas. Si falla, se sigue igual.
  try {
    const { backupIfDue } = require(path.join(SERVER_SRC, 'utils', 'backupTools.js'));
    const { sequelize } = require(path.join(SERVER_SRC, 'db.js'));
    const file = await backupIfDue(sequelize, { keep: Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10) });
    log(file ? `copia de seguridad automática: ${file}` : 'copia de seguridad automática: todavía no tocaba');
  } catch (error) {
    log(`ERROR en la copia de seguridad automática: ${error.stack || error}`);
  }

  return { server, origin: state.origin, port };
}

// Restaura una copia. Devuelve { ok, message }. Si sale bien, quien llama tiene que reiniciar la aplicación.
async function restoreBackup(name, log) {
  const tools = require(path.join(SERVER_SRC, 'utils', 'backupTools.js'));
  const { sequelize } = require(path.join(SERVER_SRC, 'db.js'));

  if (!tools.isValidBackupName(name)) return { ok: false, message: 'Nombre de copia no válido' };
  const file = path.join(state.backupsDir, name);
  if (!fs.existsSync(file)) return { ok: false, message: 'Esa copia ya no existe' };

  try {
    await tools.checkBackupFile(file); // sana y de esta aplicación, antes de tocar nada
    const saved = await tools.createBackup(sequelize, 'antes-de-restaurar');
    log(`restaurar ${name}: copia previa ${saved}`);
    await sequelize.close();
    tools.replaceDatabaseFile(state.dbFile, file);
    log(`restaurar ${name}: listo`);
    return { ok: true };
  } catch (error) {
    log(`ERROR al restaurar ${name}: ${error.stack || error}`);
    return { ok: false, message: error.message };
  }
}

// Cierra la base ordenadamente. Salir con la base abierta hace caer al módulo nativo de SQLite al terminar el proceso.
async function close() {
  if (!state.origin) return;
  try {
    await require(path.join(SERVER_SRC, 'db.js')).sequelize.close();
  } catch {
    // ya estaba cerrada
  }
}

const getState = () => ({ ...state });

module.exports = { start, restoreBackup, close, getState };
