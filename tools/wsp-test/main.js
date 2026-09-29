'use strict';
// Prueba aparte: abre WhatsApp Web en una ventana de Electron 22 (32 bits), pensada para la PC vieja del negocio
// (Windows 8.1, 1,5 GB de RAM). No usa nada de la aplicación principal. Si la página se cae, anota por qué
// (memoria, motivo del cierre, texto que mostraba) en "registro-wsp.txt" para poder diagnosticarlo.

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WHATSAPP_URL = 'https://web.whatsapp.com/';
// WhatsApp Web rechaza navegadores que considera viejos; Electron 22 trae Chromium 108. Se presenta como uno más nuevo.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const userData = app.getPath('userData');
const logFile = path.join(userData, 'registro-wsp.txt');
const configFile = path.join(userData, 'config-wsp.json');

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch {
    return {};
  }
}
const writeConfig = (changes) => fs.writeFileSync(configFile, JSON.stringify({ ...readConfig(), ...changes }, null, 2));

// La aceleración por GPU es la causa más común de cierres en PC viejas: arranca apagada (se puede prender desde el menú).
const useGpu = readConfig().gpu === true;
if (!useGpu) app.disableHardwareAcceleration();
// Menos memoria para el motor de JavaScript de la página, y sin funciones que no se usan.
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=384');
// Menos procesos = menos memoria (medido: de ~490 MB a ~410 MB con el QR en pantalla): la parte gráfica dentro del
// proceso principal y sin aislamiento de sitios (es una ventana que solo carga WhatsApp).
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,MediaRouter,IsolateOrigins,site-per-process');

const MB = (kb) => Math.round(kb / 1024);
function memorySnapshot() {
  const metrics = app.getAppMetrics();
  const total = metrics.reduce((sum, item) => sum + (item.memory?.workingSetSize ?? 0), 0);
  return { appMB: MB(total), freeMB: Math.round(os.freemem() / 1024 / 1024), totalMB: Math.round(os.totalmem() / 1024 / 1024) };
}

function log(message) {
  const m = memorySnapshot();
  const line = `${new Date().toISOString()} [app ${m.appMB} MB · libre ${m.freeMB}/${m.totalMB} MB] ${message}\n`;
  try {
    fs.appendFileSync(logFile, line);
  } catch {
    // sin registro: la prueba sigue igual
  }
}

let win = null;

function askReload(text) {
  if (!win) return;
  const choice = dialog.showMessageBoxSync(win, {
    type: 'warning',
    title: 'WhatsApp se cerró',
    message: text,
    detail: `Quedó anotado en:\n${logFile}\n\nEnviá ese archivo para ver qué pasó.`,
    buttons: ['Volver a abrir', 'Cerrar'],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice === 0) win.webContents.reload();
  else app.quit();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'WhatsApp (prueba)',
    backgroundColor: '#111b21',
    webPreferences: { partition: 'persist:whatsapp', contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setUserAgent(USER_AGENT);

  const wc = win.webContents;
  wc.on('render-process-gone', (event, details) => {
    log(`ERROR la página se cayó: motivo=${details.reason} código=${details.exitCode}`);
    const why = details.reason === 'oom' ? 'Se quedó sin memoria.' : `Motivo: ${details.reason}.`;
    askReload(`La página de WhatsApp dejó de funcionar. ${why}`);
  });
  wc.on('unresponsive', () => log('AVISO la página no responde'));
  wc.on('responsive', () => log('la página volvió a responder'));
  wc.on('did-fail-load', (event, code, description, url, isMainFrame) => {
    if (isMainFrame) log(`ERROR no cargó ${url}: ${description} (${code})`);
  });
  wc.on('did-finish-load', () => {
    log('página cargada');
    // Qué está mostrando WhatsApp (por ejemplo, un aviso de "navegador no compatible")
    setTimeout(async () => {
      try {
        const text = await wc.executeJavaScript('document.body.innerText.slice(0, 300)');
        log(`texto en pantalla: ${JSON.stringify(text)}`);
      } catch (error) {
        log(`no se pudo leer la pantalla: ${error.message}`);
      }
    }, 8000);
  });

  // Los enlaces que no son de WhatsApp (por ejemplo wa.me o páginas externas) se abren en el navegador de la PC.
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Título con la memoria: para ver cuánto usa mientras se prueba.
  const timer = setInterval(() => {
    if (!win) return;
    const m = memorySnapshot();
    win.setTitle(`WhatsApp (prueba) · usa ${m.appMB} MB · libres ${m.freeMB} MB`);
  }, 4000);
  // Una línea en el registro cada minuto: si se cierra sola, se ve cómo venía la memoria.
  const logTimer = setInterval(() => log('latido'), 60000);
  win.on('closed', () => {
    clearInterval(timer);
    clearInterval(logTimer);
    win = null;
  });

  wc.loadURL(WHATSAPP_URL);
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Prueba',
        submenu: [
          { label: 'Recargar', accelerator: 'F5', click: () => win?.webContents.reload() },
          {
            label: 'Borrar caché y recargar',
            click: async () => {
              await win?.webContents.session.clearCache();
              win?.webContents.reload();
            },
          },
          {
            label: 'Usar aceleración por GPU (reinicia)',
            type: 'checkbox',
            checked: useGpu,
            click: (item) => {
              writeConfig({ gpu: item.checked });
              log(`GPU ${item.checked ? 'activada' : 'desactivada'}: se reinicia`);
              app.relaunch();
              app.quit();
            },
          },
          { type: 'separator' },
          { label: 'Abrir el registro', click: () => shell.openPath(logFile) },
          { label: 'Salir', role: 'quit' },
        ],
      },
    ])
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => win?.focus());
  app.on('child-process-gone', (event, details) => log(`AVISO proceso interno caído: tipo=${details.type} motivo=${details.reason} código=${details.exitCode}`));
  app.whenReady().then(() => {
    log(`--- inicio · Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · ${process.platform} ${process.arch} · GPU ${useGpu ? 'sí' : 'no'} ---`);
    buildMenu();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
