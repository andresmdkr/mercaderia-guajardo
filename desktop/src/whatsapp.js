'use strict';
// WhatsApp Web en una ventana propia de la aplicación (para escribirle a un cliente desde la PC del negocio).
// Es una ventana aparte, con su propia sesión guardada (se escanea el QR una sola vez) y sin acceso a nada de la
// aplicación: solo carga web.whatsapp.com. Se crea cuando se pide y se destruye al cerrarla (libera la memoria).

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { BrowserWindow, dialog, shell } = require('electron');

const HOST = 'https://web.whatsapp.com';
const PARTITION = 'persist:whatsapp';
// WhatsApp Web rechaza navegadores que considera viejos, y el Chromium de Electron 22 lo es: se presenta como uno más nuevo.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ALLOWED_PERMISSIONS = new Set(['notifications', 'media', 'clipboard-sanitized-write', 'fullscreen']);
// Solo enlaces wa.me con un número (los arma la pantalla de Clientes), nunca una dirección cualquiera.
const PHONE_LINK = /^https:\/\/wa\.me\/(\d{8,15})$/;
const CHAT_WAIT_MS = 3000; // cuánto se espera a que WhatsApp cambie de chat por su cuenta antes de recargar

let win = null;
let currentPhone = null; // el último chat pedido
let probe = null; // intento de abrir un chat sin recargar: { link, notHandled }
let openedChat = null; // { phone, header }: el último chat que se abrió sin recargar (para no repetirlo si sigue a la vista)
let probing = false;

const isOpen = () => win !== null && !win.isDestroyed();
const parsePhone = (url) => PHONE_LINK.exec(String(url))?.[1] ?? null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ¿Este contenido es la ventana de WhatsApp? (main.js le aplica reglas de navegación distintas)
const owns = (contents) => isOpen() && win.webContents === contents;

// Lo que dice el encabezado del chat abierto ('' si no hay ninguno). Sirve para notar que WhatsApp cambió de chat.
const READ_CHAT_HEADER = "(() => { const main = document.querySelector('#main'); return main ? (main.querySelector('header') || main).innerText.slice(0, 120) : ''; })()";
// ¿WhatsApp ya está cargado y con la sesión iniciada? (aparece la lista de chats)
const IS_LOGGED_IN = "Boolean(document.querySelector('#pane-side'))";
// Toca un enlace, como si se hubiera tocado un enlace de wa.me dentro de un chat: WhatsApp Web los abre por su cuenta.
const clickLink = (link) =>
  `(() => { const a = document.createElement('a'); a.href = ${JSON.stringify(link)}; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove(); })()`;

/**
 * Abre el chat con la página ya cargada, sin recargar WhatsApp (recargar tarda mucho en una PC lenta).
 * Devuelve true si WhatsApp cambió de chat solo. Si no (no está con la sesión iniciada, no maneja el enlace o el
 * chat no cambió), devuelve false y quien llama recarga la página como último recurso.
 */
async function openInPage(phone, log) {
  const contents = win.webContents;
  if (!(await contents.executeJavaScript(IS_LOGGED_IN).catch(() => false))) {
    log('WhatsApp: sin sesión iniciada o todavía cargando: se recarga');
    return false;
  }
  const before = await contents.executeJavaScript(READ_CHAT_HEADER).catch(() => '');
  if (before && openedChat?.phone === phone && openedChat.header === before) return true; // ya está a la vista

  for (const link of [`https://wa.me/${phone}`, `https://api.whatsapp.com/send?phone=${phone}`]) {
    // Si WhatsApp no maneja el enlace, el navegador intenta abrir una ventana: eso lo delata (ver setWindowOpenHandler).
    let notHandled = false;
    probe = { link, notHandled: () => (notHandled = true) };
    try {
      await contents.executeJavaScript(clickLink(link), true);
      const deadline = Date.now() + CHAT_WAIT_MS;
      while (Date.now() < deadline && !notHandled) {
        await sleep(300);
        const after = await contents.executeJavaScript(READ_CHAT_HEADER).catch(() => '');
        if (after && after !== before) {
          log(`WhatsApp: chat abierto sin recargar (con ${new URL(link).host})`);
          openedChat = { phone, header: after };
          return true;
        }
      }
      log(`WhatsApp: ${notHandled ? 'no manejó' : 'no cambió el chat con'} el enlace de ${new URL(link).host}`);
    } catch (error) {
      log(`WhatsApp: falló el intento sin recargar: ${error.message}`);
      return false;
    } finally {
      probe = null;
    }
  }
  return false;
}

function create({ icon, log }) {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 700,
    minHeight: 500,
    title: 'WhatsApp',
    icon,
    autoHideMenuBar: true,
    backgroundColor: '#111b21',
    webPreferences: { partition: PARTITION, contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  const contents = win.webContents;
  contents.setUserAgent(USER_AGENT);
  contents.session.setUserAgent(USER_AGENT);
  contents.session.setPermissionRequestHandler((_wc, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)));
  contents.session.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));

  // Cualquier otro sitio (enlaces dentro de un chat, por ejemplo) se abre en el navegador del sistema.
  contents.setWindowOpenHandler(({ url }) => {
    if (probe && url === probe.link) {
      probe.notHandled(); // era nuestro intento de abrir el chat sin recargar, y WhatsApp no lo manejó
      return { action: 'deny' };
    }
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith(`${HOST}/`)) return;
    event.preventDefault();
    if (/^https:\/\//.test(url)) shell.openExternal(url);
  });

  contents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame) log(`WhatsApp: no cargó ${url}: ${description} (${code})`);
  });
  contents.on('unresponsive', () => log('WhatsApp: la página no responde'));
  contents.on('render-process-gone', async (_event, details) => {
    log(`WhatsApp: la página se cayó (motivo=${details.reason}, código=${details.exitCode})`);
    const phone = currentPhone;
    const why = details.reason === 'oom' ? 'Se quedó sin memoria.' : `Motivo: ${details.reason}.`;
    // La aplicación del negocio sigue andando: solo se ofrece seguir en el navegador de la PC.
    const { response } = await dialog.showMessageBox({
      type: 'warning',
      title: 'WhatsApp',
      message: `La ventana de WhatsApp dejó de funcionar. ${why}`,
      detail: 'Tu trabajo en la aplicación no se perdió. Podés abrir el chat en el navegador de la PC.',
      buttons: ['Abrir en el navegador', 'Cerrar WhatsApp'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0 && phone) shell.openExternal(`https://wa.me/${phone}`);
    close();
  });

  win.on('closed', () => {
    win = null;
    currentPhone = null;
    probe = null;
    openedChat = null;
  });
}

// Abre (o trae al frente) la ventana de WhatsApp en el chat de ese número. Devuelve { ok, message }.
// Si la ventana ya estaba abierta con la sesión iniciada, cambia de chat sin recargar; si no, carga el chat.
async function open(url, { icon, log }, { paste = false } = {}) {
  const phone = parsePhone(url);
  if (!phone) return { ok: false, message: 'Enlace de WhatsApp no válido' };
  if (probing) return { ok: true }; // ya está cambiando de chat: un segundo toque no tiene que pisarlo

  currentPhone = phone;
  const existed = isOpen();
  if (!existed) create({ icon, log });
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();

  const contents = win.webContents;
  if (existed && !contents.isLoading() && contents.getURL().startsWith(HOST)) {
    probing = true;
    try {
      if (await openInPage(phone, log)) {
        if (paste) pasteWhenReady(log); // sin esperarlo: la pantalla no tiene que quedar bloqueada
        return { ok: true };
      }
    } finally {
      probing = false;
    }
    if (!isOpen()) return { ok: true }; // la cerraron mientras tanto
  }

  log(`WhatsApp: carga el chat (ventana ${existed ? 'ya abierta' : 'nueva'})`);
  openedChat = null;
  const loading = win.webContents.loadURL(`${HOST}/send?phone=${phone}`).catch(() => {});
  if (paste) loading.then(() => pasteWhenReady(log));
  return { ok: true };
}

// Lanza otro programa de WhatsApp (por ejemplo la prueba aparte) pasándole solo el número. El programa lo elige el
// usuario en Configuración; acá se comprueba que exista, que sea un .exe y se lo abre sin consola ni intérprete de comandos.
// Si no se puede abrir, se avisa y se ofrece el navegador. Devuelve { ok, message }.
function openWithProgram(program, url, { log }) {
  const phone = parsePhone(url);
  if (!phone) return { ok: false, message: 'Enlace de WhatsApp no válido' };
  const fallback = (message) => {
    log(`WhatsApp: no se pudo abrir el programa elegido (${message})`);
    dialog
      .showMessageBox({
        type: 'warning',
        title: 'WhatsApp',
        message: 'No se pudo abrir el programa de WhatsApp elegido.',
        detail: `${message}\n\nPodés elegir otro en Configuración, o abrir el chat en el navegador de la PC.`,
        buttons: ['Abrir en el navegador', 'Cancelar'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => response === 0 && shell.openExternal(url));
    return { ok: false, message };
  };

  if (typeof program !== 'string' || path.extname(program).toLowerCase() !== '.exe' || !fs.existsSync(program)) {
    return fallback(`No se encuentra el programa: ${program || '(ninguno elegido)'}`);
  }
  try {
    const child = spawn(program, [`--telefono=${phone}`], { detached: true, stdio: 'ignore', shell: false });
    child.once('error', (error) => fallback(error.message));
    child.unref();
    log(`WhatsApp: abre el chat con ${path.basename(program)}`);
    return { ok: true };
  } catch (error) {
    return fallback(error.message);
  }
}

// Pega lo que hay en el portapapeles (el comprobante, copiado como archivo) en el chat abierto. Espera a que el chat
// esté listo (aparece el campo para escribir). Si no llega a abrirse, el usuario lo pega a mano con Ctrl+V.
async function pasteWhenReady(log) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline && isOpen()) {
    const ready = await win.webContents.executeJavaScript("Boolean(document.querySelector('#main footer'))").catch(() => false);
    if (ready) {
      await sleep(700); // deja que WhatsApp termine de acomodar el chat y le dé el foco al campo
      if (!isOpen()) return;
      win.webContents.focus();
      win.webContents.paste();
      log('WhatsApp: comprobante pegado en el chat');
      return;
    }
    await sleep(500);
  }
  log('WhatsApp: no se pegó solo el comprobante (el chat no llegó a abrirse)');
}

function close() {
  if (isOpen()) win.destroy();
}

module.exports = { open, openWithProgram, close, owns, parsePhone };
