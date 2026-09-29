'use strict';
// WhatsApp Guajardo: abre WhatsApp Web en una ventana de Electron 22 (32 bits), pensada para la PC vieja del negocio
// (Windows 8.1, 1,5 GB de RAM). No usa nada de la aplicación principal. Si la página se cae, anota por qué
// (memoria, motivo del cierre, texto que mostraba) en "registro-wsp.txt" para poder diagnosticarlo.

const { app, BrowserWindow, Menu, Tray, dialog, nativeImage, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const WHATSAPP_URL = 'https://web.whatsapp.com/';
// La aplicación del negocio la puede abrir con un número: WhatsAppGuajardo.exe --telefono=5491155551234
// Con --pegar, cuando el chat está listo se pega lo que haya en el portapapeles (el comprobante, copiado como archivo)
const wantsPaste = (argv) => argv.includes('--pegar');
// Con --archivo=<ruta del PDF> también puede soltarlo sobre el chat si pegar no funcionó (plan B)
const fileFromArgs = (argv) => {
  const found = argv.map((arg) => /^--archivo=(.+\.pdf)$/i.exec(arg)).find(Boolean)?.[1] ?? null;
  return found && fs.existsSync(found) ? found : null;
};
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

// --- Segundo plano ---
// --oculto           arranca sin mostrar la ventana (precarga): WhatsApp termina de cargar mientras se trabaja en otra cosa.
// --segundo-plano=si|no   al cerrar la ventana, el programa sigue corriendo (queda un ícono junto al reloj de Windows).
// La aplicación del negocio manda estas señales según lo que se elija en Configuración → WhatsApp.
const startedAt = Date.now();
const startHidden = process.argv.includes('--oculto');
let keepAlive = readConfig().background === true;
let quitting = false; // true cuando de verdad se quiere salir (menú, ícono de la bandeja, apagado de Windows)
let tray = null;

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
// Nombre del contacto del chat abierto ('' si no hay ninguno): la primera línea del encabezado. Se compara solo el nombre porque
// el resto del encabezado ("en línea", "últ. vez hoy 14:05") cambia solo, y eso hacía creer que el chat había cambiado (o no).
const READ_CHAT_NAME = "(() => { const main = document.querySelector('#main'); if (!main) return ''; const header = main.querySelector('header') || main; return (header.innerText || '').split('\\n').map((line) => line.trim()).find(Boolean) || ''; })()";
// Qué muestra WhatsApp: 'chats' (sesión iniciada), 'qr' (pide vincular) o 'cargando'
const PAGE_STATE = "document.querySelector('#pane-side') ? 'chats' : (/Escanea|Vincular/.test(document.body.innerText) ? 'qr' : 'cargando')";
const IS_LOGGED_IN = "Boolean(document.querySelector('#pane-side'))";
const HAS_CHAT_OPEN = "Boolean(document.querySelector('#main footer'))";
const clickLink = (link) =>
  `(() => { const a = document.createElement('a'); a.href = ${JSON.stringify(link)}; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); })()`;

// Espera (hasta `ms`) a que una expresión de la página sea verdadera.
async function waitFor(expression, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end && win) {
    if (await win.webContents.executeJavaScript(expression).catch(() => false)) return true;
    await sleep(400);
  }
  return false;
}

// Recargar WhatsApp entero tarda un minuto o más en esta PC: solo se hace cuando de verdad no hay otra salida.
// Devuelve true si el chat quedó abierto sin recargar.
async function openInPage(phone, paste) {
  const contents = win.webContents;
  if (!(await contents.executeJavaScript(IS_LOGGED_IN).catch(() => false))) {
    const state = await contents.executeJavaScript(PAGE_STATE).catch(() => 'cargando');
    if (state === 'qr') {
      log('WhatsApp pide vincular el teléfono (QR): no se puede cambiar de chat');
      return false;
    }
    // La lista de chats puede faltar un momento mientras WhatsApp se acomoda: se espera antes de recargar.
    log('todavía no se ven los chats: espero hasta 20 s antes de recargar');
    if (!(await waitFor(IS_LOGGED_IN, 20000))) {
      log('siguen sin verse los chats: se recarga');
      return false;
    }
  }
  const before = await contents.executeJavaScript(READ_CHAT_NAME).catch(() => '');
  if (before && openedChat?.phone === phone && openedChat.name === before) {
    log(`el chat de ${before} ya estaba abierto: no hace falta recargar`);
    return true;
  }

  for (const link of [`https://wa.me/${phone}`, `https://api.whatsapp.com/send?phone=${phone}`]) {
    let notHandled = false;
    probe = { link, notHandled: () => (notHandled = true) };
    try {
      await contents.executeJavaScript(clickLink(link), true);
      const clickedAt = Date.now();
      const deadline = clickedAt + 12000; // la PC es lenta
      while (Date.now() < deadline && !notHandled) {
        await sleep(300);
        const after = await contents.executeJavaScript(READ_CHAT_NAME).catch(() => '');
        if (after && after !== before) {
          log(`chat abierto sin recargar (con ${new URL(link).host})`);
          openedChat = { phone, name: after };
          return true;
        }
        // El chat pedido probablemente ya estaba abierto (WhatsApp no cambia nada). Para solo abrirlo no hace falta seguir esperando ni recargar:
        // si igual cambiara más tarde, se ve. Con un comprobante para pegar sí hay que estar seguros del chat, así que se sigue esperando.
        if (!paste && Date.now() - clickedAt > 5000 && (await contents.executeJavaScript(HAS_CHAT_OPEN).catch(() => false))) {
          log('el chat no cambió: se toma como ya abierto y no se recarga');
          if (before) openedChat = { phone, name: before };
          return true;
        }
      }
      if (!notHandled) {
        log(`aceptó el enlace de ${new URL(link).host} pero el chat no cambió en 12 s`);
        return false;
      }
      log(`no manejó el enlace de ${new URL(link).host}`);
    } catch (error) {
      log(`falló el intento sin recargar: ${error.message}`);
      return false;
    } finally {
      probe = null;
    }
  }
  return false;
}

// Después de recargar con /send?phone=, se anota qué chat quedó abierto para reconocerlo la próxima vez.
let rememberId = 0;
async function rememberChatWhenOpen(phone, id) {
  const end = Date.now() + 120000;
  while (Date.now() < end && win && id === rememberId) {
    const name = await win.webContents.executeJavaScript(READ_CHAT_NAME).catch(() => '');
    if (name) {
      openedChat = { phone, name };
      log(`chat abierto tras cargar: ${name}`);
      return;
    }
    await sleep(1000);
  }
}

// Pega el portapapeles (el comprobante, copiado como archivo) en el chat abierto:
// 1) espera a que el chat esté listo (aparece el campo para escribir; en una PC lenta WhatsApp puede tardar minutos en
//    bajar los mensajes), 2) enfoca el campo de mensaje (sin foco en él, pegar no hace nada), 3) pega y comprueba que
//    el archivo llegó a la página, 4) si no llegó, suelta el archivo sobre el chat (plan B).
// Si nada anda, el archivo sigue copiado y se pega a mano con Ctrl+V.
const FOCUS_COMPOSER = `(() => {
  const selectors = ['#main footer [contenteditable="true"]', '#main [contenteditable="true"][role="textbox"]', 'footer [contenteditable="true"]'];
  let box = null;
  for (const selector of selectors) {
    const found = document.querySelectorAll(selector);
    if (found.length) { box = found[found.length - 1]; break; }
  }
  if (!box) return null;
  box.focus();
  const el = document.activeElement;
  return { tag: el.tagName, editable: Boolean(el.isContentEditable), role: el.getAttribute('role'), tab: el.getAttribute('data-tab'), enFooter: Boolean(el.closest('footer')) };
})()`;
const LISTEN_PASTE = "(() => { window.__mgPaste = null; document.addEventListener('paste', (e) => { window.__mgPaste = { files: e.clipboardData.files.length }; }, { capture: true, once: true }); })()";
const CENTER_OF_CHAT = "(() => { const m = document.querySelector('#main') || document.body; const r = m.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()";
const PASTE_WAIT_MS = 180000;

// Plan B: soltar el archivo sobre el chat (como arrastrarlo desde una carpeta), con el protocolo de depuración.
async function dropFile(file, log) {
  if (!file || !fs.existsSync(file)) return;
  const contents = win.webContents;
  try {
    const point = await contents.executeJavaScript(CENTER_OF_CHAT);
    contents.debugger.attach('1.3');
    try {
      const data = { items: [], files: [file], dragOperationsMask: 1 };
      for (const type of ['dragEnter', 'dragOver', 'drop']) {
        await contents.debugger.sendCommand('Input.dispatchDragEvent', { type, x: point.x, y: point.y, data });
      }
      log('se soltó el archivo sobre el chat (plan B)');
    } finally {
      contents.debugger.detach();
    }
  } catch (error) {
    log(`no se pudo soltar el archivo: ${error.message}`);
  }
}

async function pasteWhenReady(log, file) {
  const deadline = Date.now() + PASTE_WAIT_MS;
  let ready = false;
  while (Date.now() < deadline && (win && !win.isDestroyed())) {
    ready = await win.webContents.executeJavaScript("Boolean(document.querySelector('#main footer'))").catch(() => false);
    if (ready) break;
    await sleep(500);
  }
  if (!ready || !((win && !win.isDestroyed()))) {
    log('no se pegó solo el comprobante (el chat no llegó a abrirse)');
    return;
  }
  await sleep(800); // deja que WhatsApp termine de acomodar el chat
  if (!((win && !win.isDestroyed()))) return;
  const contents = win.webContents;
  const focused = await contents.executeJavaScript(FOCUS_COMPOSER).catch(() => null);
  log(`campo de mensaje enfocado: ${JSON.stringify(focused)}`);
  if (!focused || !focused.editable) {
    // Sin el campo de mensaje enfocado, pegar no sirve (el evento llega a la página pero WhatsApp lo ignora).
    log('no se encontró el campo de mensaje: se prueba soltando el archivo');
    await dropFile(file, log);
    return;
  }
  await contents.executeJavaScript(LISTEN_PASTE).catch(() => {});
  contents.focus();
  contents.paste();
  await sleep(1500);
  const got = await contents.executeJavaScript('window.__mgPaste').catch(() => null);
  log(got ? `el pegado llegó a la página con ${got.files} archivo(s)` : 'el pegado no llegó a la página');
  if (got && got.files > 0) return;
  await dropFile(file, log);
}


// Abre el chat de ese número: sin recargar si se puede, recargando si no. Con paste, pega el comprobante al final.
let opening = false;
async function openChat(phone, paste = false, file = null) {
  if (!win || opening) return;
  log(`pedido desde la aplicación del negocio: chat de ${phone}${paste ? ' (con comprobante)' : ''}`);
  const wasHidden = !win.isVisible();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  if (wasHidden) await sleep(700); // deja que la ventana oculta se pinte antes de tocar la página (oculta, el navegador la tiene frenada)
  if (!win) return;

  // Si la página está cargando (por ejemplo WhatsApp se está acomodando solo), se espera en vez de recargar encima.
  if (win.webContents.isLoading()) {
    log('la página todavía está cargando: espero antes de abrir el chat');
    await waitFor('document.readyState === "complete"', 15000);
    if (!win) return;
  }
  if (!win.webContents.isLoading() && win.webContents.getURL().startsWith(WHATSAPP_URL)) {
    opening = true;
    try {
      if (await openInPage(phone, paste)) {
        if (paste) pasteWhenReady(log, file);
        return;
      }
    } finally {
      opening = false;
    }
  }
  log('carga el chat (recarga la página)');
  openedChat = null;
  rememberId += 1;
  const loading = win.webContents.loadURL(`${WHATSAPP_URL}send?phone=${phone}`).catch(() => {});
  loading.then(() => rememberChatWhenOpen(phone, rememberId));
  if (paste) loading.then(() => pasteWhenReady(log, file));
}

function showWindow() {
  if (!win) createWindow({ hidden: false });
  if (win.isMinimized()) win.restore();
  win.setSkipTaskbar(false);
  win.show();
  win.focus();
}

function quitForReal() {
  quitting = true;
  app.quit();
}

// El ícono junto al reloj existe solo mientras el segundo plano está activo: es la única forma de volver a abrir la ventana oculta.
function ensureTray() {
  if (keepAlive && !tray) {
    const image = nativeImage.createFromBuffer(fs.readFileSync(path.join(__dirname, 'build', 'icon.png'))).resize({ width: 16, height: 16, quality: 'best' });
    tray = new Tray(image);
    tray.setToolTip('WhatsApp Guajardo');
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Abrir WhatsApp', click: showWindow },
        { label: 'Salir', click: quitForReal },
      ])
    );
    tray.on('click', showWindow);
    log('ícono de la bandeja creado');
  } else if (!keepAlive && tray) {
    tray.destroy();
    tray = null;
    log('ícono de la bandeja quitado');
  }
}

function setKeepAlive(value) {
  if (keepAlive === value) return;
  keepAlive = value;
  writeConfig({ background: value });
  log(`segundo plano ${value ? 'activado: al cerrar la ventana el programa sigue corriendo' : 'desactivado: al cerrar la ventana el programa se cierra'}`);
  ensureTray();
  buildMenu();
}

function applyBackgroundArg(argv) {
  const found = argv.map((arg) => /^--segundo-plano=(si|no)$/.exec(arg)).find(Boolean)?.[1];
  if (found !== undefined) setKeepAlive(found === 'si');
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

function createWindow({ hidden = false } = {}) {
  win = new BrowserWindow({
    show: !hidden,
    skipTaskbar: hidden,
    width: 1100,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    title: 'WhatsApp Guajardo',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#111b21',
    // Oculta, el navegador frena las páginas para ahorrar batería: mientras carga por primera vez se lo impide (ver watchReady).
    webPreferences: { partition: 'persist:whatsapp', contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: !hidden },
  });
  win.webContents.setUserAgent(USER_AGENT);

  const wc = win.webContents;
  win.on('page-title-updated', (event) => event.preventDefault());
  win.on('close', (event) => {
    if (keepAlive && !quitting) {
      event.preventDefault();
      win.hide();
      log('ventana oculta: WhatsApp sigue corriendo en segundo plano');
    }
  });
  win.on('session-end', () => {
    quitting = true; // Windows se está apagando o cerrando la sesión: no hay que frenarlo
  });

  // Cuánto tarda en estar lista: desde que empieza a cargar hasta que se ven los chats (o el QR). Sirve para decidir
  // si conviene el segundo plano o la precarga en esa PC.
  let navStart = Date.now();
  let navId = 0;
  const seconds = (ms) => (ms / 1000).toFixed(1);
  const watchReady = async (id) => {
    const deadline = Date.now() + 10 * 60 * 1000;
    let qrLogged = false;
    while (Date.now() < deadline && win && id === navId) {
      const state = await win.webContents
        .executeJavaScript(PAGE_STATE)
        .catch(() => 'cargando');
      if (state === 'chats') {
        log(`WhatsApp LISTO: se ven los chats a los ${seconds(Date.now() - navStart)} s de empezar a cargar (${seconds(Date.now() - startedAt)} s desde que se abrió el programa)`);
        if (hidden) win.webContents.setBackgroundThrottling(true); // ya cargó: oculto puede volver a ahorrar recursos
        return;
      }
      if (state === 'qr' && !qrLogged) {
        log(`WhatsApp pide escanear el QR (a los ${seconds(Date.now() - navStart)} s)`);
        qrLogged = true;
      }
      await sleep(1000);
    }
  };
  win.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) {
      navStart = Date.now();
      navId += 1;
    }
  });
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
    watchReady(navId);
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
  const loadingStart = wc.loadURL(startPhone ? `${WHATSAPP_URL}send?phone=${startPhone}` : WHATSAPP_URL).catch(() => {});
  if (startPhone && wantsPaste(process.argv)) loadingStart.then(() => pasteWhenReady(log, fileFromArgs(process.argv)));
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
          {
            label: 'Seguir en segundo plano al cerrar la ventana',
            type: 'checkbox',
            checked: keepAlive,
            click: (item) => setKeepAlive(item.checked),
          },
          { type: 'separator' },
          { label: 'Abrir el registro', click: () => shell.openPath(logFile) },
          { label: 'Salir', click: quitForReal },
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
    applyBackgroundArg(argv);
    const phone = phoneFromArgs(argv);
    if (phone) {
      showWindow(); // por si estaba oculta
      openChat(phone, wantsPaste(argv), fileFromArgs(argv));
    } else if (!argv.includes('--oculto')) {
      showWindow(); // abrir el programa a mano trae la ventana al frente; --oculto (precarga) no toca nada
    }
  });
  app.on('before-quit', () => {
    quitting = true;
  });
  app.on('child-process-gone', (event, details) => log(`AVISO proceso interno caído: tipo=${details.type} motivo=${details.reason} código=${details.exitCode}`));
  app.whenReady().then(() => {
    log(`--- inicio · Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · ${process.platform} ${process.arch} · GPU ${useGpu ? 'sí' : 'no'} ---`);
    applyBackgroundArg(process.argv);
    if (startHidden && !keepAlive) setKeepAlive(true); // oculto sin ícono para volver a abrirlo no serviría
    ensureTray();
    buildMenu();
    if (startHidden) log('arranca oculto (precarga)');
    createWindow({ hidden: startHidden });
  });
  app.on('window-all-closed', () => app.quit());
}
