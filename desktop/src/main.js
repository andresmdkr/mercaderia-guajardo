'use strict';
// Mercadería Guajardo — aplicación de escritorio. Abre el servidor local (Express + SQLite) dentro del propio
// programa y muestra la interfaz en una ventana. Los datos viven en %APPDATA%\Mercadería Guajardo.

const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, Menu, Tray, clipboard, dialog, ipcMain, nativeImage, shell } = require('electron');
const appServer = require('./appServer');
const diagnostics = require('./diagnostics');
const { printInChildProcess, runPrintJob } = require('./print');
const receiptShare = require('./receiptShare');
const updates = require('./updates');
const whatsapp = require('./whatsapp');

const SMOKE_TEST = process.argv.includes('--smoke-test'); // modo automático sin ventana (lo usa GitHub Actions)

// Segunda copia del programa que solo imprime (ver print.js): usa su propia carpeta temporal y no toca los datos.
const PRINT_JOB = (process.argv.find((arg) => arg.startsWith('--print-job=')) ?? '').slice('--print-job='.length);
if (PRINT_JOB) app.setPath('userData', path.dirname(PRINT_JOB));

// La prueba automática usa una carpeta temporal: nunca toca los datos reales del negocio.
if (SMOKE_TEST) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'mg-smoke-')));

const ICON = path.join(__dirname, '..', 'build', 'icon.ico');
const SETUP_HTML = path.join(__dirname, 'setup.html');
const SETUP_URL = pathToFileURL(SETUP_HTML).href;
const START_HIDDEN = process.argv.includes('--oculto'); // lo usa el arranque con Windows: abre sin mostrar la ventana
let logFile = null;
let mainWindow = null;
let splash = null;
let notifiedVersionReady = false;

// Cómo se usa esta computadora: 'main' (guarda los datos; puede dejar entrar a otras PC por la red del local) o
// 'client' (segunda PC: muestra los datos de la principal y no tiene base propia).
let role = 'main';
let setupWindow = null;
let setupResolve = null; // mientras se está eligiendo el rol por primera vez
let setupView = 'choose';
let setupClosing = false; // se está cerrando a propósito (ya se eligió): no es "cerró sin elegir"
let tray = null;
let quitting = false;
let appReady = false; // recién con la ventana principal creada, cerrar todas las ventanas termina el programa

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
    if (whatsapp.owns(contents)) return; // navega solo dentro de web.whatsapp.com (lo controla whatsapp.js)
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

// Con "Usar desde otra computadora" prendido, el programa tiene que seguir andando aunque se cierre la ventana
// (si no, la otra PC se queda sin datos): cerrar solo la oculta y queda un ícono junto al reloj.
const keepRunning = () => role === 'main' && appServer.getState().lan.enabled;

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function ensureTray() {
  if (keepRunning() && !tray) {
    tray = new Tray(nativeImage.createFromPath(ICON));
    tray.setToolTip('Mercadería Guajardo (sigue funcionando para las otras computadoras)');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir Mercadería Guajardo', click: showMainWindow },
        { type: 'separator' },
        { label: 'Salir (las otras computadoras se quedan sin conexión)', click: () => { quitting = true; app.quit(); } },
      ])
    );
    tray.on('click', showMainWindow);
  } else if (!keepRunning() && tray) {
    tray.destroy();
    tray = null;
  }
}

// El programa arranca solo con Windows únicamente si es la PC principal y deja entrar a otras (si no, no hace falta).
function applyAutoStart() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    app.setLoginItemSettings({ openAtLogin: keepRunning(), args: keepRunning() ? ['--oculto'] : [] });
  } catch (error) {
    log(`no se pudo configurar el arranque con Windows: ${error.message}`);
  }
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
    if (START_HIDDEN && keepRunning()) return; // arranque con Windows: queda en segundo plano, con su ícono junto al reloj
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on('close', (event) => {
    if (!keepRunning() || quitting) return;
    event.preventDefault();
    mainWindow.hide();
    if (tray && !app.hasShownBackgroundHint) {
      app.hasShownBackgroundHint = true;
      tray.displayBalloon?.({ title: 'Mercadería Guajardo sigue funcionando', content: 'Las otras computadoras pueden seguir usándolo. Para cerrarlo del todo, usá "Salir" en este ícono.' });
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    whatsapp.close(); // si se cierra la aplicación, la ventana de WhatsApp no queda huérfana
  });
  // Segunda PC: si la principal no responde al abrir o recargar, se muestra una pantalla clara en vez de la página de error.
  mainWindow.webContents.on('did-fail-load', (_event, code, _description, _url, isMainFrame) => {
    if (role === 'client' && isMainFrame && code !== -3) showConnectionProblem();
  });
  mainWindow.loadURL(origin);
  appReady = true;
}

// --- Elegir cómo se usa esta computadora, y conectarse a la principal (setup.html) ---
function openSetupWindow(view) {
  setupView = view;
  if (setupWindow) {
    setupWindow.webContents.reload();
    return;
  }
  setupWindow = new BrowserWindow({
    width: 560,
    height: 520,
    resizable: false,
    center: true,
    autoHideMenuBar: true,
    title: 'Mercadería Guajardo',
    icon: ICON,
    backgroundColor: '#FAF9F5',
    webPreferences: { preload: path.join(__dirname, 'setupPreload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  setupWindow.on('closed', () => {
    setupWindow = null;
    const onPurpose = setupClosing;
    setupClosing = false;
    if (!onPurpose && (setupResolve || !appReady)) app.quit(); // cerró esta pantalla sin elegir nada
  });
  setupWindow.loadFile(SETUP_HTML);
}

function closeSetupWindow() {
  if (!setupWindow) return;
  const window = setupWindow;
  setupClosing = true; // ya se resolvió: cerrar no tiene que terminar el programa
  window.close();
}

// Primera vez en una instalación nueva: pregunta si es la principal o una segunda PC. Devuelve 'main' o 'client'.
function askRole() {
  return new Promise((resolve) => {
    setupResolve = resolve;
    openSetupWindow('choose');
  });
}

function showConnectionProblem() {
  openSetupWindow('problem'); // primero la pantalla nueva: si no, por un instante no habría ninguna ventana y el programa se cerraría
  if (mainWindow) {
    const window = mainWindow;
    mainWindow = null;
    window.destroy();
  }
}

// Segunda PC: abre la pantalla de la principal (si responde) o muestra el aviso.
async function openClientWindow(serverUrl) {
  const { origin } = appServer.startRemote({ dataDir: app.getPath('userData'), serverUrl });
  const check = await appServer.checkServer(origin);
  log(`modo conexión: ${origin} → ${check.ok ? `responde (versión ${check.version})` : 'no responde'}`);
  if (!check.ok) {
    if (splash) splash.close();
    splash = null;
    appReady = true;
    openSetupWindow('problem');
    return;
  }
  createMainWindow(origin);
  closeSetupWindow();
}

function registerSetupIpc() {
  const setupHandle = (channel, action) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (event.senderFrame.url !== SETUP_URL) throw new Error('Origen no permitido');
      return action(...args);
    });
  const serverUrl = () => appServer.readConfig(app.getPath('userData')).serverUrl ?? null;

  setupHandle('setup:get-state', () => ({ view: setupView, serverUrl: serverUrl(), canChoose: Boolean(setupResolve) }));
  setupHandle('setup:use-main', () => {
    appServer.writeConfig(app.getPath('userData'), { role: 'main' });
    log('esta PC se configuró como principal');
    const resolve = setupResolve;
    closeSetupWindow();
    if (resolve) resolve('main');
    return { ok: true };
  });
  setupHandle('setup:connect', async (address) => {
    const url = appServer.normalizeServerUrl(address);
    if (!url) return { ok: false, message: 'Escribí la dirección como aparece en la PC principal, por ejemplo 192.168.1.20' };
    const check = await appServer.checkServer(url);
    if (!check.ok) return check;
    appServer.writeConfig(app.getPath('userData'), { role: 'client', serverUrl: url });
    log(`esta PC se configuró como segunda PC, conectada a ${url}`);
    const resolve = setupResolve;
    if (resolve) {
      setupResolve = null;
      resolve('client'); // el arranque sigue y abre la ventana
    } else {
      await openClientWindow(url); // venía del aviso de "no encuentro la PC principal"
    }
    return { ok: true };
  });
  setupHandle('setup:retry', async () => {
    const url = serverUrl();
    if (!url) return { ok: false, message: 'Falta la dirección de la PC principal' };
    const check = await appServer.checkServer(url);
    if (!check.ok) return check;
    await openClientWindow(url);
    return { ok: true };
  });
  setupHandle('setup:quit', () => {
    quitting = true;
    app.quit();
  });
}

// --- Comunicación con la pantalla (solo se le contesta a nuestra propia interfaz) ---
// { mainOnly }: acciones sobre los archivos de ESTA computadora (copias, carpeta, modo de prueba): en una segunda PC no existen.
function handle(channel, action, { mainOnly = false } = {}) {
  ipcMain.handle(channel, (event, ...args) => {
    const origin = appServer.getState().origin;
    if (!origin || !event.senderFrame.url.startsWith(origin)) throw new Error('Origen no permitido');
    if (mainOnly && role === 'client') return { ok: false, message: 'Esto se hace en la PC principal.' };
    return action(...args);
  });
}

// WhatsApp: 'integrated' = ventana propia dentro de la aplicación (por defecto); 'browser' = navegador del sistema;
// 'program' = otro programa elegido en Configuración (config.json → whatsappProgram).
const whatsappSettings = () => {
  const config = appServer.readConfig(appServer.getState().dataDir);
  const mode = ['browser', 'program'].includes(config.whatsapp) ? config.whatsapp : 'integrated';
  return {
    mode,
    program: typeof config.whatsappProgram === 'string' ? config.whatsappProgram : null,
    keepAlive: config.whatsappKeepAlive === true, // WhatsApp Guajardo sigue corriendo al cerrar su ventana
    preload: config.whatsappPreload === true, // se abre oculto al iniciar esta aplicación
  };
};

// Precarga de WhatsApp: si está activada (y se usa "En otra aplicación"), unos segundos después de abrir esta aplicación
// se abre WhatsApp Guajardo oculto. La demora deja que esta aplicación termine de arrancar primero (la PC es lenta).
const PRELOAD_DELAY_MS = 15000;
function schedulePreload() {
  setTimeout(() => {
    const { mode, program, preload } = whatsappSettings();
    if (mode === 'program' && preload) whatsapp.preloadProgram(program, { log });
  }, PRELOAD_DELAY_MS);
}

function relaunch() {
  app.relaunch();
  app.quit(); // pasa por before-quit, que cierra la base
}

function registerIpc() {
  // Quién es esta PC: lo necesita la pantalla antes de dibujarse (para ocultar lo que solo vale en la principal).
  ipcMain.on('desktop:get-role', (event) => {
    event.returnValue = event.senderFrame.url.startsWith(appServer.getState().origin ?? '\0') ? role : 'main';
  });

  handle('desktop:open-backups-folder', async () => {
    const dir = appServer.getState().backupsDir;
    fs.mkdirSync(dir, { recursive: true });
    return { ok: (await shell.openPath(dir)) === '' };
  }, { mainOnly: true });

  handle('desktop:restore-backup', async (name) => {
    const result = await appServer.restoreBackup(name, log);
    if (result.ok) setTimeout(relaunch, 300); // deja contestar a la pantalla y reabre con la base restaurada
    return result;
  }, { mainOnly: true });

  // Modo de prueba: la app se reinicia con otra base (la demo, o de nuevo la real).
  handle('desktop:enter-demo', async () => {
    const result = await appServer.enterDemo(log);
    if (result.ok) setTimeout(relaunch, 300);
    return result;
  }, { mainOnly: true });

  handle('desktop:exit-demo', async (fresh) => {
    const result = await appServer.exitDemo({ fresh: fresh === true }, log);
    if (result.ok) setTimeout(relaunch, 300);
    return result;
  }, { mainOnly: true });

  // Conexión entre computadoras: datos para la tarjeta de Configuración.
  handle('desktop:get-info', () => {
    const state = appServer.getState();
    const port = state.lan.port ?? appServer.PREFERRED_PORT;
    return {
      role,
      version: app.getVersion(),
      serverUrl: state.serverUrl,
      lan: { enabled: state.lan.enabled, port, urls: appServer.lanAddresses().map(({ name, address }) => ({ name, url: `http://${address}:${port}` })) },
    };
  });
  // Prende o apaga "Usar desde otra computadora". Reinicia la app (el servidor cambia de dirección de escucha).
  handle('desktop:set-lan', (enabled) => {
    if (typeof enabled !== 'boolean') return { ok: false, message: 'Valor no válido' };
    appServer.writeConfig(appServer.getState().dataDir, { lan: enabled });
    log(`usar desde otra computadora: ${enabled ? 'activado' : 'desactivado'}`);
    setTimeout(() => {
      quitting = true; // que el reinicio no se quede en segundo plano
      relaunch();
    }, 300);
    return { ok: true };
  }, { mainOnly: true });
  // Segunda PC: deja de estar conectada y vuelve a preguntar cómo se usa (por ejemplo para pasar a ser la principal).
  handle('desktop:disconnect', () => {
    appServer.writeConfig(appServer.getState().dataDir, { role: null, serverUrl: null });
    log('esta PC se desconectó de la principal');
    setTimeout(relaunch, 300);
    return { ok: true };
  });

  handle('desktop:open-whatsapp', (url) => {
    if (!whatsapp.parsePhone(url)) return { ok: false, message: 'Enlace de WhatsApp no válido' };
    const { mode, program, keepAlive, preload } = whatsappSettings();
    if (mode === 'browser') {
      shell.openExternal(url);
      return { ok: true };
    }
    if (mode === 'program') return whatsapp.openWithProgram(program, url, { log }, { keepAlive: keepAlive || preload });
    return whatsapp.open(url, { icon: ICON, log });
  });
  // Enviar un comprobante por WhatsApp: se guarda el PDF, se deja copiado como archivo y se abre el chat (por donde
  // esté configurado). Con la ventana propia se pega solo; con las otras opciones hay que pegarlo con Ctrl+V.
  handle('desktop:share-whatsapp-file', async ({ url, filename, base64 } = {}) => {
    if (!whatsapp.parsePhone(url)) return { ok: false, message: 'Enlace de WhatsApp no válido' };
    let file;
    try {
      file = receiptShare.saveReceipt(path.join(appServer.getState().dataDir, 'Comprobantes'), filename, base64);
    } catch (error) {
      return { ok: false, message: error.message };
    }
    const copy = await receiptShare.copyFileToClipboard(file);
    if (!copy.ok) log(`WhatsApp: no se pudo copiar el comprobante al portapapeles: ${copy.message}`);
    const { mode, program, keepAlive, preload } = whatsappSettings();
    let opened = { ok: true };
    if (mode === 'browser') shell.openExternal(url);
    else if (mode === 'program') opened = whatsapp.openWithProgram(program, url, { log }, { paste: copy.ok, file, keepAlive: keepAlive || preload });
    else opened = await whatsapp.open(url, { icon: ICON, log }, { paste: copy.ok, file });
    // Si no se pudo dejar copiado, se muestra el archivo en su carpeta para arrastrarlo al chat.
    if (!copy.ok) shell.showItemInFolder(file);
    // El pegado automático lo hacen la ventana propia y WhatsApp Guajardo (que entiende --pegar); los demás programas, no.
    const ownProgram = mode === 'program' && /whatsappguajardo/i.test(path.basename(program ?? ''));
    return { ok: opened.ok, message: opened.message, mode, copied: copy.ok, autoPaste: (mode === 'integrated' || ownProgram) && copy.ok };
  });

  handle('desktop:get-whatsapp-settings', () => whatsappSettings());
  // Opciones de WhatsApp Guajardo: 'keepAlive' (segundo plano) y 'preload' (precarga al abrir esta aplicación).
  handle('desktop:set-whatsapp-option', (name, value) => {
    const keys = { keepAlive: 'whatsappKeepAlive', preload: 'whatsappPreload' };
    if (!Object.hasOwn(keys, name) || typeof value !== 'boolean') return { ok: false };
    appServer.writeConfig(appServer.getState().dataDir, { [keys[name]]: value });
    log(`WhatsApp: ${name} = ${value}`);
    return { ok: true };
  });
  handle('desktop:set-whatsapp-mode', (mode) => {
    if (!['integrated', 'browser', 'program'].includes(mode)) return { ok: false };
    appServer.writeConfig(appServer.getState().dataDir, { whatsapp: mode });
    log(`WhatsApp: modo ${mode}`);
    return { ok: true };
  });
  // Elegir el programa de WhatsApp (un .exe). Devuelve { canceled, program }; solo se guarda si se eligió uno.
  handle('desktop:choose-whatsapp-program', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Elegí el programa de WhatsApp',
      properties: ['openFile'],
      filters: [{ name: 'Programas', extensions: ['exe'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { canceled: true };
    const program = result.filePaths[0];
    appServer.writeConfig(appServer.getState().dataDir, { whatsappProgram: program });
    log(`WhatsApp: programa elegido ${program}`);
    return { canceled: false, program };
  });

  handle('desktop:get-update-status', () => updates.getStatus());
  handle('desktop:check-for-updates', () => updates.check());
  handle('desktop:install-update', () => updates.install());

  handle('desktop:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Elegí la carpeta para la copia externa (un pendrive, Google Drive, Dropbox...)',
      properties: ['openDirectory', 'createDirectory'],
    });
    return { canceled: result.canceled, folder: result.filePaths[0] ?? null };
  }, { mainOnly: true });

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
  if (mainWindow) return showMainWindow();
  if (setupWindow) setupWindow.focus();
});

// Instalación nueva (sin base ni configuración): hay que preguntar si es la PC principal o una segunda PC.
// Una instalación que ya venía funcionando (tiene su base) sigue siendo la principal, sin preguntar nada.
function needsRoleQuestion(dataDir, config) {
  if (config.role === 'main' || config.role === 'client') return false;
  const existing = ['mercaderia.sqlite', 'demo.sqlite'].some((name) => fs.existsSync(path.join(dataDir, name)));
  return !existing && config.mode === undefined;
}

app.whenReady().then(async () => {
  if (!isFirstInstance) return;
  if (PRINT_JOB) return runPrintJob(PRINT_JOB);
  logFile = diagnostics.logPath(app.getPath('userData'));
  log(`--- inicio (versión ${app.getVersion()}, ${process.platform} ${process.arch}) ---`);

  if (SMOKE_TEST) return runSmokeTest();

  Menu.setApplicationMenu(null);
  const dataDir = app.getPath('userData');
  registerSetupIpc();
  try {
    let config = appServer.readConfig(dataDir);
    if (needsRoleQuestion(dataDir, config)) {
      role = await askRole(); // la pantalla queda abierta hasta que se elige
      config = appServer.readConfig(dataDir);
    } else if (config.role !== 'main' && config.role !== 'client') {
      appServer.writeConfig(dataDir, { role: 'main' });
    }
    createSplash();
    role = config.role === 'client' && appServer.normalizeServerUrl(config.serverUrl) ? 'client' : 'main';

    if (role === 'client') {
      registerIpc();
      await openClientWindow(appServer.normalizeServerUrl(config.serverUrl));
      updates.setup({ onChange: onUpdateChange, logger: log });
      updates.check();
      return;
    }
    const { origin } = await appServer.start({ dataDir, appVersion: app.getVersion(), log });
    registerIpc();
    createMainWindow(origin);
    ensureTray();
    applyAutoStart();
    schedulePreload();
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
  quitting = true;
  if (databaseClosed || SMOKE_TEST || PRINT_JOB) return;
  event.preventDefault();
  databaseClosed = true;
  appServer.close().finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (PRINT_JOB) return; // la copia que imprime termina sola cuando deja su resultado
  if (appReady && !keepRunning()) app.quit();
});
