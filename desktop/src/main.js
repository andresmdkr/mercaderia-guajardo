'use strict';
// Prueba mínima de la aplicación de escritorio: una ventana con un informe de compatibilidad.
// Sirve para comprobar, en la PC real del negocio (Windows 8.1, 32 bits, 2 GB), que corren las
// piezas que necesita la aplicación final: Electron 22, SQLite, servidor local y actualizaciones.

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, Menu, net } = require('electron');
const diagnostics = require('./diagnostics');

const SMOKE_TEST = process.argv.includes('--smoke-test'); // modo automático (lo usa GitHub Actions)
const RENDERER_DIR = path.join(__dirname, 'renderer');
const REPO = 'andresmdkr/mercaderia-guajardo';

const state = {
  checks: [],
  update: { status: 'idle', message: 'Todavía no se buscaron actualizaciones.' },
  internet: null,
};
let autoUpdater = null;
let logFile = null;

function log(message) {
  if (!logFile) return;
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
  } catch {
    // si no se puede escribir el registro, no pasa nada
  }
}

process.on('uncaughtException', (error) => log(`ERROR no controlado: ${error.stack || error}`));
process.on('unhandledRejection', (error) => log(`ERROR promesa: ${error && error.stack ? error.stack : error}`));

// --- Internet: usa el mismo mecanismo de red que el actualizador ---
function internetCheck() {
  return new Promise((resolve) => {
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    let finished = false;
    const done = (result) => {
      if (!finished) {
        finished = true;
        resolve(result);
      }
    };
    const timer = setTimeout(() => done(diagnostics.check('internet', 'Conexión a internet (GitHub)', false, 'No respondió en 15 segundos')), 15000);
    try {
      const request = net.request({ url, method: 'GET' });
      request.setHeader('User-Agent', 'mercaderia-guajardo-desktop');
      request.on('response', (response) => {
        clearTimeout(timer);
        response.on('data', () => {});
        response.on('end', () => {});
        // 200 = hay una versión publicada; 404 = el sitio respondió pero todavía no hay versiones
        const reachable = response.statusCode === 200 || response.statusCode === 404;
        done(diagnostics.check('internet', 'Conexión a internet (GitHub)', reachable, `GitHub respondió (código ${response.statusCode})`));
      });
      request.on('error', (error) => {
        clearTimeout(timer);
        done(diagnostics.check('internet', 'Conexión a internet (GitHub)', false, `Sin conexión o error de seguridad: ${error.message}`));
      });
      request.end();
    } catch (error) {
      clearTimeout(timer);
      done(diagnostics.check('internet', 'Conexión a internet (GitHub)', false, error.message));
    }
  });
}

// --- Actualizaciones ---
function setUpdate(status, message) {
  state.update = { status, message };
  log(`actualización: ${status} - ${message}`);
}

function setupUpdater() {
  if (!app.isPackaged) {
    setUpdate('disabled', 'Las actualizaciones solo funcionan en la versión instalada.');
    return;
  }
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (error) {
    setUpdate('error', `No se pudo cargar el actualizador: ${error.message}`);
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => setUpdate('checking', 'Buscando actualizaciones...'));
  autoUpdater.on('update-available', (info) => setUpdate('downloading', `Hay una versión nueva (${info.version}). Descargando...`));
  autoUpdater.on('update-not-available', () => setUpdate('none', `Ya tenés la última versión (${app.getVersion()}).`));
  autoUpdater.on('download-progress', (progress) => setUpdate('downloading', `Descargando la actualización: ${Math.round(progress.percent)}%`));
  autoUpdater.on('update-downloaded', (info) => setUpdate('ready', `La versión ${info.version} está lista para instalar.`));
  autoUpdater.on('error', (error) => setUpdate('error', `No se pudo actualizar: ${error && error.message ? error.message : error}`));
}

function checkForUpdates() {
  if (!autoUpdater) return;
  autoUpdater.checkForUpdates().catch((error) => setUpdate('error', `No se pudo buscar actualizaciones: ${error.message}`));
}

// --- Servidor local: sirve la pantalla y responde el informe ---
function sendJson(response, data, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function handleRequest(request, response) {
  const { pathname } = new URL(request.url, 'http://127.0.0.1');

  if (pathname === '/api/ping') return sendJson(response, { ok: true });
  if (pathname === '/api/report') {
    return sendJson(response, {
      version: app.getVersion(),
      packaged: app.isPackaged,
      checks: [...state.checks, ...(state.internet ? [state.internet] : []), diagnostics.memoryCheck(app)],
      update: state.update,
    });
  }
  if (pathname === '/api/check-update' && request.method === 'POST') {
    checkForUpdates();
    return sendJson(response, { ok: true });
  }
  if (pathname === '/api/install-update' && request.method === 'POST') {
    if (autoUpdater && state.update.status === 'ready') setImmediate(() => autoUpdater.quitAndInstall(true, true));
    return sendJson(response, { ok: true });
  }

  const file = pathname === '/' ? 'index.html' : path.basename(pathname); // solo archivos de la carpeta renderer
  fs.readFile(path.join(RENDERER_DIR, file), (error, content) => {
    if (error) return sendJson(response, { message: 'No encontrado' }, 404);
    const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  });
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1020,
    height: 780,
    minWidth: 720,
    minHeight: 520,
    title: 'Mercadería Guajardo — prueba de compatibilidad',
    backgroundColor: '#FAF9F5',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const origin = `http://127.0.0.1:${port}`;
  // Seguridad (esta versión de Electron ya no recibe correcciones): la ventana solo puede mostrar la pantalla propia.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadURL(origin);
  return win;
}

async function collectMainChecks() {
  const userData = app.getPath('userData');
  return [
    diagnostics.systemCheck(),
    diagnostics.engineCheck(),
    diagnostics.clockCheck(),
    diagnostics.dataFolderCheck(userData),
    await diagnostics.sqliteCheck(userData),
  ];
}

async function runSmokeTest() {
  const out = process.env.SMOKE_OUT;
  let ok = false;
  let checks = [];
  try {
    checks = await collectMainChecks();
    const { server, port } = await diagnostics.startLocalServer(handleRequest);
    checks.push(await diagnostics.serverCheck(port));
    server.close();
    ok = checks.every((item) => item.ok);
  } catch (error) {
    checks.push(diagnostics.check('smoke', 'Prueba automática', false, error.stack || String(error)));
  }
  if (out) fs.writeFileSync(out, JSON.stringify({ ok, version: app.getVersion(), checks }, null, 2));
  app.exit(ok ? 0 : 1);
}

// Una sola copia de la aplicación abierta a la vez (si ya hay otra, esta se cierra antes de hacer nada).
const isFirstInstance = SMOKE_TEST || app.requestSingleInstanceLock();
if (!isFirstInstance) app.quit();

app.whenReady().then(async () => {
  if (!isFirstInstance) return;
  logFile = path.join(app.getPath('userData'), 'registro.txt');
  log(`--- inicio (versión ${app.getVersion()}, ${process.platform} ${process.arch}) ---`);

  if (SMOKE_TEST) return runSmokeTest();

  Menu.setApplicationMenu(null);
  const { port } = await diagnostics.startLocalServer(handleRequest);
  state.checks = await collectMainChecks();
  state.checks.push(await diagnostics.serverCheck(port));
  createWindow(port);

  setupUpdater();
  internetCheck().then((result) => {
    state.internet = result;
    log(`internet: ${result.ok ? 'ok' : 'falló'} - ${result.detail}`);
    if (result.ok) checkForUpdates();
    else setUpdate('error', 'No hay conexión con GitHub, no se pueden buscar actualizaciones.');
  });
});

app.on('window-all-closed', () => app.quit());
