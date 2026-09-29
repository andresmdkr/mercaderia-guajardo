'use strict';
// WhatsApp Guajardo: abre WhatsApp Web en una ventana de Electron 22 (32 bits), pensada para la PC vieja del negocio
// (Windows 8.1, 1,5 GB de RAM). No usa nada de la aplicación principal. Si la página se cae, anota por qué
// (memoria, motivo del cierre, texto que mostraba) en "registro-wsp.txt" para poder diagnosticarlo.

const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WHATSAPP_URL = 'https://web.whatsapp.com/';
// La aplicación del negocio la puede abrir con un número: WhatsAppGuajardo.exe --telefono=5491155551234
const phoneFromArgs = (argv) => argv.map((arg) => /^--telefono=(\d{8,15})$/.exec(arg)).find(Boolean)?.[1] ?? null;
// WhatsApp Web rechaza navegadores que considera viejos; Electron 22 trae Chromium 108. Se presenta como uno más nuevo.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const userData = app.getPath('userData');

// Antes se llamaba "whatsapp-prueba": si quedó la carpeta de datos vieja y la nueva todavía no tiene sesión, se copia
// su contenido, así el QR ya escaneado no se pierde con el cambio de nombre. (Electron crea la carpeta nueva vacía antes
// de llegar acá, por eso se mira si tiene sesión y no si existe.) Si algo falla se sigue igual: solo habría que escanear el QR.
try {
  const oldData = path.join(app.getPath('appData'), 'whatsapp-prueba');
  if (fs.existsSync(oldData) && !fs.existsSync(path.join(userData, 'Partitions'))) {
    fs.cpSync(oldData, userData, { recursive: true, force: false });
    fs.rmSync(oldData, { recursive: true, force: true });
  }
} catch {
  // se empieza de cero
}
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
    // sin registro: el programa sigue igual
  }
}

let win = null;
let probe = null; // intento de abrir un chat sin recargar: { link, notHandled }
let openedChat = null; // { phone, header }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// (Misma lógica que desktop/src/whatsapp.js de la aplicación del negocio: cambiar de chat sin recargar la página.)
const READ_CHAT_HEADER = "(() => { const main = document.querySelector('#main'); return main ? (main.querySelector('header') || main).innerText.slice(0, 120) : ''; })()";
const IS_LOGGED_IN = "Boolean(document.querySelector('#pane-side'))";
const clickLink = (link) =>
  `(() => { const a = document.createElement('a'); a.href = ${JSON.stringify(link)}; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); })()`;

async function openInPage(phone) {
  const contents = win.webContents;
  if (!(await contents.executeJavaScript(IS_LOGGED_IN).catch(() => false))) return false;
  const before = await contents.executeJavaScript(READ_CHAT_HEADER).catch(() => '');
  if (before && openedChat?.phone === phone && openedChat.header === before) return true;
  for (const link of [`https://wa.me/${phone}`, `https://api.whatsapp.com/send?phone=${phone}`]) {
    let notHandled = false;
    probe = { link, notHandled: () => (notHandled = true) };
    try {
      await contents.executeJavaScript(clickLink(link), true);
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline && !notHandled) {
        await sleep(300);
        const after = await contents.executeJavaScript(READ_CHAT_HEADER).catch(() => '');
        if (after && after !== before) {
          log(`chat abierto sin recargar (con ${new URL(link).host})`);
          openedChat = { phone, header: after };
          return true;
        }
      }
      log(`${notHandled ? 'no manejó' : 'no cambió el chat con'} el enlace de ${new URL(link).host}`);
    } catch (error) {
      log(`falló el intento sin recargar: ${error.message}`);
      return false;
    } finally {
      probe = null;
    }
  }
  return false;
}

// Abre el chat de ese número: sin recargar si se puede, recargando si no.
let opening = false;
async function openChat(phone) {
  if (!win || opening) return;
  log(`pedido desde la aplicación del negocio: chat de ${phone}`);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  if (!win.webContents.isLoading() && win.webContents.getURL().startsWith(WHATSAPP_URL)) {
    opening = true;
    try {
      if (await openInPage(phone)) return;
    } finally {
      opening = false;
    }
  }
  log('carga el chat (recarga la página)');
  openedChat = null;
  win.webContents.loadURL(`${WHATSAPP_URL}send?phone=${phone}`);
}

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
    title: 'WhatsApp Guajardo',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#111b21',
    webPreferences: { partition: 'persist:whatsapp', contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.setUserAgent(USER_AGENT);

  const wc = win.webContents;
  win.on('page-title-updated', (event) => event.preventDefault());
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
    if (probe && url === probe.link) {
      probe.notHandled();
      return { action: 'deny' };
    }
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Título con la memoria: para ver cuánto usa (en una PC con poca RAM sirve saberlo).
  const timer = setInterval(() => {
    if (!win) return;
    const m = memorySnapshot();
    win.setTitle(`WhatsApp Guajardo · usa ${m.appMB} MB · libres ${m.freeMB} MB`);
  }, 4000);
  // Una línea en el registro cada minuto: si se cierra sola, se ve cómo venía la memoria.
  const logTimer = setInterval(() => log('latido'), 60000);
  win.on('closed', () => {
    clearInterval(timer);
    clearInterval(logTimer);
    win = null;
  });

  const startPhone = phoneFromArgs(process.argv);
  wc.loadURL(startPhone ? `${WHATSAPP_URL}send?phone=${startPhone}` : WHATSAPP_URL);
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Opciones',
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
  // Si la aplicación del negocio la vuelve a abrir con otro número, esta misma ventana cambia de chat.
  app.on('second-instance', (event, argv) => {
    win?.focus();
    const phone = phoneFromArgs(argv);
    if (phone) openChat(phone);
  });
  app.on('child-process-gone', (event, details) => log(`AVISO proceso interno caído: tipo=${details.type} motivo=${details.reason} código=${details.exitCode}`));
  app.whenReady().then(() => {
    log(`--- inicio · Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · ${process.platform} ${process.arch} · GPU ${useGpu ? 'sí' : 'no'} ---`);
    buildMenu();
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
