'use strict';
// El servidor de la aplicación (Express + SQLite) corriendo dentro del propio programa, más las tareas
// que necesitan tocar la base: backup automático y restauración de una copia.

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const LOCAL_HOST = '127.0.0.1'; // por defecto solo se puede entrar desde esta misma PC
const LAN_HOST = '0.0.0.0'; // con "Usar desde otra computadora" prendido, también desde la red del local
// Puerto fijo (si está libre): el navegador guarda las preferencias (modo claro/oscuro) por dirección, con puerto incluido.
const PREFERRED_PORT = 38417;
const SERVER_SRC = path.join(__dirname, '..', 'app', 'server', 'src');
const CLIENT_DIST = path.join(__dirname, '..', 'app', 'client', 'dist');
const MIGRATIONS = path.join(__dirname, '..', 'app', 'server', 'migrations');

// role: 'main' (esta PC guarda los datos) o 'client' (esta PC se conecta a la principal y no tiene base propia).
// lan: { enabled, port } cuando esta PC es la principal y deja entrar a otras computadoras.
const state = { origin: null, dataDir: null, backupsDir: null, dbFile: null, mode: 'real', role: 'main', serverUrl: null, lan: { enabled: false, port: null } };

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

function isPortFree(port, host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

// Si otras PC entran por la red, el puerto tiene que ser siempre el mismo (la dirección que se escribe allá no puede cambiar).
async function findPort(host, lan) {
  if (lan) {
    if (await isPortFree(PREFERRED_PORT, host)) return PREFERRED_PORT;
    throw new Error(`El puerto ${PREFERRED_PORT} está ocupado por otro programa, y hace falta para que otra computadora se conecte. Cerrá ese programa o apagá "Usar desde otra computadora" en Configuración.`);
  }
  for (let port = PREFERRED_PORT; port < PREFERRED_PORT + 10; port += 1) {
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`No hay ningún puerto libre entre ${PREFERRED_PORT} y ${PREFERRED_PORT + 9}`);
}

// --- Conexión entre computadoras ---

// Direcciones de esta PC dentro de la red del local (las que se escriben en la otra computadora).
function lanAddresses() {
  const result = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const item of list ?? []) {
      if (item.family !== 'IPv4' || item.internal) continue;
      if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)) continue; // solo redes privadas (la del local)
      result.push({ name, address: item.address });
    }
  }
  return result;
}

// "192.168.1.20", "192.168.1.20:38417" o "http://pc-negocio:38417/" → "http://192.168.1.20:38417". null si no sirve.
function normalizeServerUrl(input) {
  if (typeof input !== 'string') return null;
  let text = input.trim();
  if (!text || text.length > 200) return null;
  if (!/^https?:\/\//i.test(text)) text = `http://${text}`;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' || url.username || url.password || !/^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(url.hostname)) return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;
  return `http://${url.hostname}:${url.port || PREFERRED_PORT}`;
}

// ¿Hay un Mercadería Guajardo en esa dirección? Devuelve { ok, version, demo } o { ok: false, message }.
function checkServer(origin, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const request = http.get(`${origin}/api/version`, { timeout: timeoutMs }, (response) => {
      let body = '';
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (response.statusCode === 200 && typeof data.version === 'string') return resolve({ ok: true, version: data.version, demo: data.demo === true });
        } catch {
          // no era nuestro servidor
        }
        resolve({ ok: false, message: 'En esa dirección hay algo, pero no es Mercadería Guajardo.' });
      });
    });
    request.on('timeout', () => request.destroy(new Error('tiempo agotado')));
    request.on('error', () => resolve({ ok: false, message: 'No se pudo conectar. Revisá que la PC principal esté prendida, con el programa abierto y con "Usar desde otra computadora" activado.' }));
  });
}

// Define la configuración (variables de entorno que lee el servidor) y arranca. Devuelve { origin, port }.
async function start({ dataDir, appVersion, log }) {
  fs.mkdirSync(dataDir, { recursive: true });
  const config = readConfig(dataDir);
  const lan = config.lan === true;
  const host = lan ? LAN_HOST : LOCAL_HOST;
  const port = await findPort(host, lan);

  state.dataDir = dataDir;
  state.role = 'main';
  state.mode = config.mode === 'demo' ? 'demo' : 'real';
  state.lan = { enabled: lan, port };
  Object.assign(state, locations(dataDir, state.mode));
  state.origin = `http://${LOCAL_HOST}:${port}`; // esta PC siempre se conecta a sí misma por la dirección local

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
  const server = await startServer({ port, host });
  log(`servidor en ${host}:${port} (${lan ? 'abierto a la red del local' : 'solo esta PC'}) · base ${state.dbFile}`);

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

// Modo conexión: esta PC no arranca servidor ni base; muestra la pantalla de la PC principal. Devuelve { origin }.
function startRemote({ dataDir, serverUrl }) {
  fs.mkdirSync(dataDir, { recursive: true });
  state.dataDir = dataDir;
  state.role = 'client';
  state.serverUrl = serverUrl;
  state.origin = new URL(serverUrl).origin;
  state.lan = { enabled: false, port: null };
  return { origin: state.origin };
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
  if (!state.origin || state.role === 'client') return; // en modo conexión no hay base propia
  try {
    await require(path.join(SERVER_SRC, 'db.js')).sequelize.close();
  } catch {
    // ya estaba cerrada
  }
}

const getState = () => ({ ...state });

module.exports = { start, startRemote, lanAddresses, normalizeServerUrl, checkServer, LOCAL_HOST, PREFERRED_PORT, restoreBackup, enterDemo, exitDemo, close, getState, readConfig, writeConfig };
