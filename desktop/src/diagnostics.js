'use strict';
// Revisiones de compatibilidad de la prueba mínima: sistema, memoria, carpeta de datos, SQLite y servidor local.
// Cada revisión devuelve { id, label, ok, detail } y nunca lanza errores: si algo falla, lo cuenta.

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const toMB = (bytes) => `${Math.round(bytes / 1024 / 1024)} MB`;

const check = (id, label, ok, detail) => ({ id, label, ok, detail });

// El Node de Electron 22 llama "Windows 10" a Windows 11 (su número de versión 10.0 no cambió): se distingue por la compilación.
function windowsName() {
  const build = Number.parseInt(os.release().split('.')[2] ?? '0', 10);
  return build >= 22000 ? os.version().replace('Windows 10', 'Windows 11') : os.version();
}

function systemCheck() {
  const detail = `${windowsName()} (versión ${os.release()}) · proceso de ${process.arch === 'ia32' ? '32' : '64'} bits (${process.arch}) · procesador ${os.arch()}`;
  return check('system', 'Sistema', true, detail);
}

function engineCheck() {
  const { electron, chrome, node } = process.versions;
  return check('engine', 'Motor de la aplicación', true, `Electron ${electron} · Chromium ${chrome} · Node ${node}`);
}

// Memoria: en la PC del negocio hay 2 GB en total, así que interesa cuánto usa la aplicación.
function memoryCheck(app) {
  const total = os.totalmem();
  const free = os.freemem();
  const used = app ? app.getAppMetrics().reduce((sum, metric) => sum + metric.memory.workingSetSize * 1024, 0) : 0;
  return check(
    'memory',
    'Memoria',
    true,
    `RAM total ${toMB(total)} · libre ${toMB(free)}${used ? ` · la aplicación usa ${toMB(used)}` : ''}`
  );
}

function clockCheck() {
  const now = new Date();
  return check('clock', 'Fecha y hora', true, `${now.toLocaleString('es-AR')} (zona ${Intl.DateTimeFormat().resolvedOptions().timeZone})`);
}

// La carpeta donde se van a guardar los datos del negocio tiene que poder escribirse y leerse.
function dataFolderCheck(userDataDir) {
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    const probe = path.join(userDataDir, 'escritura.tmp');
    fs.writeFileSync(probe, 'ok');
    const ok = fs.readFileSync(probe, 'utf8') === 'ok';
    fs.rmSync(probe, { force: true });
    return check('data', 'Carpeta de datos', ok, userDataDir);
  } catch (error) {
    return check('data', 'Carpeta de datos', false, `No se puede escribir en ${userDataDir}: ${error.message}`);
  }
}

// --- SQLite ---
const run = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.run(sql, params, (error) => (error ? reject(error) : resolve())));
const get = (db, sql, params = []) =>
  new Promise((resolve, reject) => db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row))));
const close = (db) => new Promise((resolve) => db.close(() => resolve()));

async function sqliteCheck(userDataDir) {
  let sqlite3;
  try {
    sqlite3 = require('sqlite3');
  } catch (error) {
    return check('sqlite', 'Base de datos SQLite', false, `No se pudo cargar el módulo nativo: ${error.message}`);
  }

  const file = path.join(userDataDir, 'prueba.db');
  const db = await new Promise((resolve, reject) => {
    const opened = new sqlite3.Database(file, (error) => (error ? reject(error) : resolve(opened)));
  }).catch((error) => error);
  if (db instanceof Error) return check('sqlite', 'Base de datos SQLite', false, `No se pudo abrir ${file}: ${db.message}`);

  try {
    await run(db, 'CREATE TABLE IF NOT EXISTS arranques (id INTEGER PRIMARY KEY AUTOINCREMENT, cuando TEXT NOT NULL, centavos INTEGER NOT NULL CHECK (centavos >= 0))');
    await run(db, 'BEGIN IMMEDIATE');
    await run(db, 'INSERT INTO arranques (cuando, centavos) VALUES (?, ?)', [new Date().toISOString(), 123456]);
    await run(db, 'COMMIT');

    // Lo que la aplicación de verdad va a necesitar de SQLite:
    let checkRejected = false;
    await run(db, 'INSERT INTO arranques (cuando, centavos) VALUES (?, ?)', ['x', -1]).catch(() => {
      checkRejected = true;
    });
    await run(db, 'CREATE TABLE IF NOT EXISTS categorias (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)');
    await run(db, 'CREATE UNIQUE INDEX IF NOT EXISTS categorias_nombre_unico ON categorias (LOWER(nombre))');
    await run(db, 'DELETE FROM categorias');
    await run(db, "INSERT INTO categorias (nombre) VALUES ('Almacen')");
    let uniqueRejected = false;
    await run(db, "INSERT INTO categorias (nombre) VALUES ('ALMACEN')").catch(() => {
      uniqueRejected = true;
    });
    const row = await get(
      db,
      'SELECT sqlite_version() AS version, COUNT(*) AS arranques, COUNT(*) FILTER (WHERE centavos > 0) AS con_importe, SUM(centavos) AS suma FROM arranques'
    );
    const ok = checkRejected && uniqueRejected && row.con_importe === row.arranques && row.suma === row.arranques * 123456;
    return check(
      'sqlite',
      'Base de datos SQLite',
      ok,
      `SQLite ${row.version} · arranque número ${row.arranques} · restricciones CHECK ${checkRejected ? 'ok' : 'FALLAN'} · índice único sin mayúsculas ${uniqueRejected ? 'ok' : 'FALLA'} · suma en centavos ${row.suma}`
    );
  } catch (error) {
    return check('sqlite', 'Base de datos SQLite', false, `Falló una operación: ${error.message}`);
  } finally {
    await close(db);
  }
}

// --- Servidor local: la aplicación real va a servir la interfaz y la API desde el mismo proceso ---
function startLocalServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once('error', reject);
    // 127.0.0.1 y puerto libre elegido por el sistema: no choca con nada ni abre nada a la red.
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function httpGetJson(port, pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: pathname, timeout: 5000 }, (response) => {
      let body = '';
      response.on('data', (chunk) => (body += chunk));
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('tiempo agotado')));
    request.on('error', reject);
  });
}

async function serverCheck(port) {
  try {
    const answer = await httpGetJson(port, '/api/ping');
    return check('server', 'Servidor local', answer.ok === true, `escuchando en 127.0.0.1:${port} y responde`);
  } catch (error) {
    return check('server', 'Servidor local', false, `No responde en 127.0.0.1:${port}: ${error.message}`);
  }
}

module.exports = { systemCheck, engineCheck, memoryCheck, clockCheck, dataFolderCheck, sqliteCheck, startLocalServer, serverCheck, check };
