// Ayudas para las pruebas: cada archivo de prueba levanta su propio servidor, con una base SQLite
// temporal (nunca toca la base de desarrollo), y le habla por HTTP como lo haría el navegador.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const SERVER_ENTRY = path.join(__dirname, 'server-process.js');

// Acceso directo a la base (para comprobar restricciones y datos sin pasar por la API).
function openDatabase(file) {
  const db = new sqlite3.Database(file);
  db.configure('busyTimeout', 10000);
  db.run('PRAGMA foreign_keys = ON'); // SQLite las trae apagadas en cada conexión nueva
  const call = (method) => (sql, params = []) =>
    new Promise((resolve, reject) => db[method](sql, params, function callback(error, rows) {
      if (error) reject(error);
      else resolve(method === 'run' ? { changes: this.changes, lastID: this.lastID } : rows);
    }));
  return { run: call('run'), get: call('get'), all: call('all'), close: () => new Promise((resolve) => db.close(() => resolve())) };
}

class Client {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookie = '';
  }

  async request(method, pathname, body) {
    const response = await fetch(this.baseUrl + pathname, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    });
    const setCookie = response.headers.get('set-cookie') ?? '';
    if (setCookie) this.cookie = setCookie.split(';')[0];
    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // no era JSON (por ejemplo, la página de la aplicación)
    }
    return { status: response.status, data, headers: response.headers, setCookie };
  }

  get = (pathname) => this.request('GET', pathname);
  post = (pathname, body = {}) => this.request('POST', pathname, body);
  put = (pathname, body) => this.request('PUT', pathname, body);
  patch = (pathname, body) => this.request('PATCH', pathname, body);
  delete = (pathname) => this.request('DELETE', pathname);
}

/**
 * Levanta el servidor en un proceso aparte con una base temporal.
 * Con TEST_NODE_BIN=<electron.exe> corre el servidor con el Node de Electron 22 (el de la PC del negocio).
 * `extraEnv` permite ajustar variables (por ejemplo CLIENT_DIST o MIGRATIONS_DIR).
 */
async function startTestServer(extraEnv = {}, options = {}) {
  // options.dir: reabre una base que ya existe (por ejemplo, después de restaurar un backup)
  const dir = options.dir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'mg-test-'));
  const dbFile = path.join(dir, 'test.sqlite');
  const backupDir = path.join(dir, 'backups');

  const child = spawn(process.env.TEST_NODE_BIN || process.execPath, [SERVER_ENTRY], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1', // lo ignora Node; le indica a Electron que actúe como Node
      DB_FILE: dbFile,
      BACKUP_DIR: backupDir,
      JWT_SECRET: 'secreto-solo-para-pruebas',
      CLIENT_DIST: path.join(dir, 'sin-interfaz'),
      NODE_ENV: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`El servidor no arrancó en 30 s:\n${output}`)), 30000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = /READY (\d+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on('data', (chunk) => (output += chunk));
    child.once('exit', (code) => reject(new Error(`El servidor terminó (código ${code}):\n${output}`)));
  });
  child.removeAllListeners('exit');
  let exitInfo = null; // cuándo y cómo terminó el servidor (si terminó por su cuenta)
  child.once('exit', (code, signal) => {
    exitInfo = { code, signal, at: new Date().toISOString() };
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const db = openDatabase(dbFile);

  return {
    baseUrl,
    dir,
    dbFile,
    backupDir,
    db,
    client: () => new Client(baseUrl),
    output: () => output,
    pid: child.pid,
    exitCode: () => child.exitCode, // null mientras el servidor sigue vivo
    exitInfo: () => exitInfo,
    // keep: no borra la carpeta (la usa quien reabre la base). Si se pasó options.dir, tampoco la borra.
    async close({ keep = false } = {}) {
      await db.close();
      child.kill();
      await new Promise((resolve) => {
        if (child.exitCode !== null) resolve();
        else child.once('exit', resolve);
      });
      if (!keep && !options.dir) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}

// Crea el administrador por la pantalla de "primer uso" y deja la sesión iniciada en el cliente.
async function loginAsAdmin(client, credentials = {}) {
  const user = { username: 'admin', name: 'Administrador', password: 'clave-segura-1', ...credentials };
  const response = await client.post('/api/auth/setup', user);
  if (response.status !== 201) throw new Error(`No se pudo crear el administrador: ${response.status} ${JSON.stringify(response.data)}`);
  return { ...user, id: response.data.id };
}

const product = (client, code, price, cost, stock, extra = {}) =>
  client.post('/api/products', { code, name: `Producto ${code}`, costPrice: cost, salePrice: price, initialStock: stock, ...extra });

const sale = (client, items, extra = {}) => client.post('/api/sales', { items, paymentMethod: 'cash', ...extra });

module.exports = { startTestServer, loginAsAdmin, product, sale, openDatabase };
