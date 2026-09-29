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
const CHAT_WAIT_MS = 12000; // cuánto se espera a que WhatsApp cambie de chat por su cuenta antes de recargar (la PC es lenta)

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
      if (!notHandled) {
        // WhatsApp tomó el enlace pero el chat no cambió a tiempo: probar otro enlace no ayuda, se recarga.
        log(`WhatsApp: aceptó el enlace de ${new URL(link).host} pero el chat no cambió en ${CHAT_WAIT_MS / 1000} s`);
        return false;
      }
      log(`WhatsApp: no manejó el enlace de ${new URL(link).host}`);
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
async function open(url, { icon, log }, { paste = false, file = null } = {}) {
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
        if (paste) pasteWhenReady(log, file); // sin esperarlo: la pantalla no tiene que quedar bloqueada
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
  if (paste) loading.then(() => pasteWhenReady(log, file));
  return { ok: true };
}

// Lanza otro programa de WhatsApp (por ejemplo la prueba aparte) pasándole solo el número. El programa lo elige el
// usuario en Configuración; acá se comprueba que exista, que sea un .exe y se lo abre sin consola ni intérprete de comandos.
// Si no se puede abrir, se avisa y se ofrece el navegador. Devuelve { ok, message }.
function openWithProgram(program, url, { log }, { paste = false, file = null, keepAlive = false } = {}) {
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
    // --pegar: WhatsApp Guajardo pega solo el comprobante que quedó en el portapapeles (otros programas lo ignoran)
    // --segundo-plano=si|no: WhatsApp Guajardo lo aplica (y lo recuerda); otros programas lo ignoran
    const args = [`--telefono=${phone}`, `--segundo-plano=${keepAlive ? 'si' : 'no'}`, ...(paste ? ['--pegar'] : []), ...(paste && file ? [`--archivo=${file}`] : [])];
    const child = spawn(program, args, { detached: true, stdio: 'ignore', shell: false });
    child.once('error', (error) => fallback(error.message));
    child.unref();
    log(`WhatsApp: abre el chat con ${path.basename(program)}`);
    return { ok: true };
  } catch (error) {
    return fallback(error.message);
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
      log('WhatsApp: se soltó el archivo sobre el chat (plan B)');
    } finally {
      contents.debugger.detach();
    }
  } catch (error) {
    log(`WhatsApp: no se pudo soltar el archivo: ${error.message}`);
  }
}

async function pasteWhenReady(log, file) {
  const deadline = Date.now() + PASTE_WAIT_MS;
  let ready = false;
  while (Date.now() < deadline && isOpen()) {
    ready = await win.webContents.executeJavaScript("Boolean(document.querySelector('#main footer'))").catch(() => false);
    if (ready) break;
    await sleep(500);
  }
  if (!ready || !(isOpen())) {
    log('WhatsApp: no se pegó solo el comprobante (el chat no llegó a abrirse)');
    return;
  }
  await sleep(800); // deja que WhatsApp termine de acomodar el chat
  if (!(isOpen())) return;
  const contents = win.webContents;
  const focused = await contents.executeJavaScript(FOCUS_COMPOSER).catch(() => null);
  log(`WhatsApp: campo de mensaje enfocado: ${JSON.stringify(focused)}`);
  if (!focused || !focused.editable) {
    // Sin el campo de mensaje enfocado, pegar no sirve (el evento llega a la página pero WhatsApp lo ignora).
    log('WhatsApp: no se encontró el campo de mensaje: se prueba soltando el archivo');
    await dropFile(file, log);
    return;
  }
  await contents.executeJavaScript(LISTEN_PASTE).catch(() => {});
  contents.focus();
  contents.paste();
  await sleep(1500);
  const got = await contents.executeJavaScript('window.__mgPaste').catch(() => null);
  log(got ? `WhatsApp: el pegado llegó a la página con ${got.files} archivo(s)` : 'WhatsApp: el pegado no llegó a la página');
  if (got && got.files > 0) return;
  await dropFile(file, log);
}


// Precarga: abre WhatsApp Guajardo oculto (con su ícono junto al reloj) para que ya esté listo cuando haga falta.
// Si el programa ya estaba abierto no toca su ventana. Devuelve true si lo pudo lanzar.
function preloadProgram(program, { log }) {
  if (typeof program !== 'string' || path.extname(program).toLowerCase() !== '.exe' || !fs.existsSync(program)) {
    log('WhatsApp: no se precargó, no se encuentra el programa elegido');
    return false;
  }
  try {
    const child = spawn(program, ['--oculto', '--segundo-plano=si'], { detached: true, stdio: 'ignore', shell: false });
    child.once('error', (error) => log(`WhatsApp: no se pudo precargar (${error.message})`));
    child.unref();
    log(`WhatsApp: precarga de ${path.basename(program)} (oculto)`);
    return true;
  } catch (error) {
    log(`WhatsApp: no se pudo precargar (${error.message})`);
    return false;
  }
}

function close() {
  if (isOpen()) win.destroy();
}

module.exports = { open, openWithProgram, preloadProgram, close, owns, parsePhone };
