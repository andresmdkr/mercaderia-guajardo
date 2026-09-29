'use strict';
// Mercadería Guajardo — aplicación de escritorio. Abre el servidor local (Express + SQLite) dentro del propio
// programa y muestra la interfaz en una ventana. Los datos viven en %APPDATA%\Mercadería Guajardo.

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, shell } = require('electron');
const appServer = require('./appServer');
const diagnostics = require('./diagnostics');
const { printInChildProcess, runPrintJob } = require('./print');
const updates = require('./updates');

const SMOKE_TEST = process.argv.includes('--smoke-test'); // modo automático sin ventana (lo usa GitHub Actions)

// Segunda copia del programa que solo imprime (ver print.js): usa su propia carpeta temporal y no toca los datos.
const PRINT_JOB = (process.argv.find((arg) => arg.startsWith('--print-job=')) ?? '').slice('--print-job='.length);
if (PRINT_JOB) app.setPath('userData', path.dirname(PRINT_JOB));

// La prueba automática usa una carpeta temporal: nunca toca los datos reales del negocio.
if (SMOKE_TEST) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'mg-smoke-')));

const ICON = path.join(__dirname, '..', 'build', 'icon.ico');
let logFile = null;
let mainWindow = null;
let splash = null;
let notifiedVersionReady = false;

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

// --- Seguridad ---
// Esta versión de Electron ya no recibe correcciones de seguridad, por eso las ventanas solo pueden mostrar
// contenido propio: no navegan a otras páginas y solo abren ventanas para el PDF del comprobante (blob:).
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const origin = appServer.getState().origin ?? 'about:blank';
    if (!url.startsWith(origin) && !url.startsWith(`blob:${origin}/`)) event.preventDefault(); // blob: = el PDF del comprobante
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          title: 'Comprobante',
          icon: ICON,
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    // WhatsApp se abre en el navegador del sistema. Solo enlaces wa.me (nunca una dirección cualquiera).
    if (/^https:\/\/wa\.me\/\d+$/.test(url)) shell.openExternal(url);
    return { action: 'deny' }; // la pantalla usa la descarga como plan B
  });
});

// --- Ventanas ---
function createSplash() {
  splash = new BrowserWindow({
    width: 360,
    height: 220,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    icon: ICON,
    backgroundColor: '#FAF9F5',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow(origin) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Mercadería Guajardo',
    icon: ICON,
    backgroundColor: '#FAF9F5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => {
    if (splash) splash.close();
    splash = null;
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  mainWindow.loadURL(origin);
}

// --- Comunicación con la pantalla (solo se le contesta a nuestra propia interfaz) ---
function handle(channel, action) {
  ipcMain.handle(channel, (event, ...args) => {
    const origin = appServer.getState().origin;
    if (!origin || !event.senderFrame.url.startsWith(origin)) throw new Error('Origen no permitido');
    return action(...args);
  });
}

function relaunch() {
  app.relaunch();
  app.quit(); // pasa por before-quit, que cierra la base
}

function registerIpc() {
  handle('desktop:open-backups-folder', async () => {
    const dir = appServer.getState().backupsDir;
    fs.mkdirSync(dir, { recursive: true });
    return { ok: (await shell.openPath(dir)) === '' };
  });

  handle('desktop:restore-backup', async (name) => {
    const result = await appServer.restoreBackup(name, log);
    if (result.ok) setTimeout(relaunch, 300); // deja contestar a la pantalla y reabre con la base restaurada
    return result;
  });

  handle('desktop:get-update-status', () => updates.getStatus());
  handle('desktop:check-for-updates', () => updates.check());
  handle('desktop:install-update', () => updates.install());

  handle('desktop:print-html', (html) => printInChildProcess(html, { log }));

  handle('desktop:copy-diagnostics', () => {
    const report = diagnostics.buildReport({ app, server: appServer.getState(), update: updates.getStatus(), logFile });
    clipboard.writeText(report);
    return { ok: true };
  });
}

// --- Actualizaciones: se avisa a la pantalla y, cuando la versión nueva está descargada, se ofrece reiniciar ---
async function onUpdateChange(status) {
  if (mainWindow) mainWindow.webContents.send('desktop:update-status', status);
  if (status.status !== 'ready' || notifiedVersionReady || !mainWindow) return;
  notifiedVersionReady = true;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Actualización lista',
    message: status.message,
    detail: 'Podés reiniciar ahora para instalarla (tarda unos segundos), o seguir trabajando: se instala sola cuando cierres la aplicación.',
    buttons: ['Reiniciar ahora', 'Más tarde'],
    defaultId: 1,
    cancelId: 1,
  });
  if (response === 0) updates.install();
}

// --- Prueba automática (GitHub Actions): arranca todo de verdad con una carpeta temporal y revisa que responda ---
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, { timeout: 10000 }, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve({ status: response.statusCode, body }));
      })
      .on('error', reject)
      .on('timeout', function onTimeout() {
        this.destroy(new Error('tiempo agotado'));
      });
  });
}

async function runSmokeTest() {
  const checks = [];
  const add = (label, ok, detail) => checks.push({ label, ok, detail });
  try {
    const { origin } = await appServer.start({ dataDir: app.getPath('userData'), appVersion: app.getVersion(), log });
    add('Servidor y migraciones', true, origin);

    const health = await httpGet(`${origin}/api/health`);
    add('Base de datos', health.status === 200 && JSON.parse(health.body).db === 'connected', health.body);

    const version = JSON.parse((await httpGet(`${origin}/api/version`)).body).version;
    add('Versión', version === app.getVersion(), `${version} (esperada ${app.getVersion()})`);

    const home = await httpGet(`${origin}/`);
    const script = /src="(\/assets\/[^"]+\.js)"/.exec(home.body);
    add('Interfaz (index.html)', home.status === 200 && Boolean(script), script ? script[1] : 'no se encontró el script');
    const asset = script ? await httpGet(`${origin}${script[1]}`) : { status: 0 };
    add('Interfaz (archivo JS)', asset.status === 200, `código ${asset.status}`);

    const setup = await httpGet(`${origin}/api/auth/setup-status`);
    add('Auth (primer uso)', setup.status === 200, setup.body);

    const tools = require(path.join(__dirname, '..', 'app', 'server', 'src', 'utils', 'backupTools.js'));
    const { sequelize } = require(path.join(__dirname, '..', 'app', 'server', 'src', 'db.js'));
    const backup = await tools.createBackup(sequelize, 'prueba');
    await tools.checkBackupFile(backup);
    add('Copia de seguridad', true, path.basename(backup));
  } catch (error) {
    add('Prueba automática', false, error.stack || String(error));
  }
  const ok = checks.every((item) => item.ok);
  if (process.env.SMOKE_OUT) fs.writeFileSync(process.env.SMOKE_OUT, JSON.stringify({ ok, version: app.getVersion(), checks }, null, 2));
  await appServer.close();
  app.exit(ok ? 0 : 1);
}

// --- Arranque ---
// Una sola copia de la aplicación abierta a la vez (si ya hay otra, esta trae la ventana al frente y se cierra).
const isFirstInstance = SMOKE_TEST || Boolean(PRINT_JOB) || app.requestSingleInstanceLock();
if (!isFirstInstance) app.quit();

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  if (!isFirstInstance) return;
  if (PRINT_JOB) return runPrintJob(PRINT_JOB);
  logFile = diagnostics.logPath(app.getPath('userData'));
  log(`--- inicio (versión ${app.getVersion()}, ${process.platform} ${process.arch}) ---`);

  if (SMOKE_TEST) return runSmokeTest();

  Menu.setApplicationMenu(null);
  createSplash();
  try {
    const { origin } = await appServer.start({ dataDir: app.getPath('userData'), appVersion: app.getVersion(), log });
    registerIpc();
    createMainWindow(origin);
    updates.setup({ onChange: onUpdateChange, logger: log });
    updates.check();
  } catch (error) {
    log(`ERROR al iniciar: ${error.stack || error}`);
    if (splash) splash.close();
    dialog.showErrorBox('No se pudo iniciar Mercadería Guajardo', `${error.message}\n\nDetalle guardado en:\n${logFile}`);
    app.exit(1);
  }
});

// Al salir (cerrar la ventana, actualizar o restaurar) primero se cierra la base de datos.
let databaseClosed = false;
app.on('before-quit', (event) => {
  if (databaseClosed || SMOKE_TEST || PRINT_JOB) return;
  event.preventDefault();
  databaseClosed = true;
  appServer.close().finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (!PRINT_JOB) app.quit(); // la copia que imprime termina sola cuando deja su resultado
});
