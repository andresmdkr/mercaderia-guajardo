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

const state = { origin: null, dataDir: null, backupsDir: null, dbFile: null, mode: 'real' };

// config.json guarda la clave que firma las sesiones y el modo de la app ('demo' = modo de prueba).
function readConfig(dataDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, 'config.json'), 'utf8'));
  } catch {
    return {}; // primera vez, o archivo ilegible: se toma como vacío
  }
}

function writeConfig(dataDir, changes) {
  fs.writeFileSync(path.join(dataDir, 'config.json'), JSON.stringify({ ...readConfig(dataDir), ...changes }, null, 2));
}

// La clave se inventa la primera vez y queda guardada junto a los datos. Cada modo tiene la suya: una sesión abierta
// en la demo no vale en los datos reales (ni al revés), aunque los dos tengan un usuario con el mismo id.
function loadSecret(dataDir, mode) {
  const key = mode === 'demo' ? 'demoJwtSecret' : 'jwtSecret';
  const saved = readConfig(dataDir)[key];
  if (typeof saved === 'string' && saved.length >= 32) return saved; // si no, las sesiones abiertas se cierran, nada más
  const secret = crypto.randomBytes(48).toString('hex');
  writeConfig(dataDir, { [key]: secret });
  return secret;
}

// Los datos reales y los de la demo viven en archivos y carpetas de copias distintos: entrar o salir del modo
// de prueba nunca puede pisar los datos del negocio.
function locations(dataDir, mode) {
  return mode === 'demo'
    ? { dbFile: path.join(dataDir, 'demo.sqlite'), backupsDir: path.join(dataDir, 'Copias de seguridad (prueba)') }
    : { dbFile: path.join(dataDir, 'mercaderia.sqlite'), backupsDir: path.join(dataDir, 'Copias de seguridad') };
}

const removeDatabaseFiles = (dbFile) => {
  for (const suffix of ['', '-wal', '-shm', '-journal']) fs.rmSync(dbFile + suffix, { force: true });
};

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
  state.mode = readConfig(dataDir).mode === 'demo' ? 'demo' : 'real';
  Object.assign(state, locations(dataDir, state.mode));
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
    APP_MODE: state.mode === 'demo' ? 'demo' : '',
    JWT_SECRET: loadSecret(dataDir, state.mode),
  });

  const { startServer } = require(path.join(SERVER_SRC, 'server.js'));
  const server = await startServer({ port, host: HOST });
  log(`servidor local en ${state.origin} · base ${state.dbFile}`);

  // Una copia por día: al abrir la aplicación, si la última tiene más de 20 horas. Si falla, se sigue igual.
  // (En la demo no: son datos de ejemplo y se regeneran cuando se quiere.)
  if (state.mode === 'demo') return { server, origin: state.origin, port };
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

// Entra al modo de prueba (o lo reinicia si ya estaba): cierra la base, borra la demo anterior y deja el modo
// guardado. La demo se vuelve a armar al arrancar. Quien llama tiene que reiniciar la aplicación.
async function enterDemo(log) {
  try {
    await close();
    const { dbFile } = locations(state.dataDir, 'demo');
    removeDatabaseFiles(dbFile);
    writeConfig(state.dataDir, { mode: 'demo' });
    log('modo de prueba: activado');
    return { ok: true };
  } catch (error) {
    log(`ERROR al entrar al modo de prueba: ${error.stack || error}`);
    return { ok: false, message: error.message };
  }
}

// Marca de tiempo local de los nombres de backup: 2026-09-29_21-54-03
function backupStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// Sale del modo de prueba. Con fresh = true además aparta los datos reales como una copia
// ("antes-de-empezar-de-cero", restaurable desde Configuración) para que la app arranque vacía.
// Sin fresh, los datos reales no se tocan. Quien llama tiene que reiniciar la aplicación.
async function exitDemo({ fresh }, log) {
  try {
    await close();
    if (fresh) {
      const real = locations(state.dataDir, 'real');
      const wal = real.dbFile + '-wal';
      if (fs.existsSync(wal) && fs.statSync(wal).size > 0) {
        return { ok: false, message: 'La base real quedó a medio cerrar. Salí y volvé a abrir la aplicación sin la demo antes de empezar de cero.' };
      }
      if (fs.existsSync(real.dbFile)) {
        fs.mkdirSync(real.backupsDir, { recursive: true });
        const saved = path.join(real.backupsDir, `mercaderia_${backupStamp()}_antes-de-empezar-de-cero.sqlite`);
        fs.renameSync(real.dbFile, saved);
        removeDatabaseFiles(real.dbFile); // restos vacíos (-wal, -shm)
        log(`empezar de cero: datos reales guardados en ${saved}`);
      }
    }
    writeConfig(state.dataDir, { mode: 'real' });
    log(`modo de prueba: desactivado (empezar de cero: ${Boolean(fresh)})`);
    return { ok: true };
  } catch (error) {
    log(`ERROR al salir del modo de prueba: ${error.stack || error}`);
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

module.exports = { start, restoreBackup, enterDemo, exitDemo, close, getState };
