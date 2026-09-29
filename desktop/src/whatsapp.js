'use strict';
// WhatsApp Web en una ventana propia de la aplicación (para escribirle a un cliente desde la PC del negocio).
// Es una ventana aparte, con su propia sesión guardada (se escanea el QR una sola vez) y sin acceso a nada de la
// aplicación: solo carga web.whatsapp.com. Se crea cuando se pide y se destruye al cerrarla (libera la memoria).

const { BrowserWindow, dialog, shell } = require('electron');

const HOST = 'https://web.whatsapp.com';
const PARTITION = 'persist:whatsapp';
// WhatsApp Web rechaza navegadores que considera viejos, y el Chromium de Electron 22 lo es: se presenta como uno más nuevo.
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const ALLOWED_PERMISSIONS = new Set(['notifications', 'media', 'clipboard-sanitized-write', 'fullscreen']);
// Solo enlaces wa.me con un número (los arma la pantalla de Clientes), nunca una dirección cualquiera.
const PHONE_LINK = /^https:\/\/wa\.me\/(\d{8,15})$/;

let win = null;
let currentPhone = null;

const isOpen = () => win !== null && !win.isDestroyed();
const parsePhone = (url) => PHONE_LINK.exec(String(url))?.[1] ?? null;

// ¿Este contenido es la ventana de WhatsApp? (main.js le aplica reglas de navegación distintas)
const owns = (contents) => isOpen() && win.webContents === contents;

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
  });
}

// Abre (o trae al frente) la ventana de WhatsApp en el chat de ese número. Devuelve { ok, message }.
function open(url, { icon, log }) {
  const phone = parsePhone(url);
  if (!phone) return { ok: false, message: 'Enlace de WhatsApp no válido' };

  currentPhone = phone;
  const existed = isOpen();
  if (!existed) create({ icon, log });
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  log(`WhatsApp: abre el chat de un cliente (ventana ${existed ? 'ya abierta' : 'nueva'})`);
  win.webContents.loadURL(`${HOST}/send?phone=${phone}`);
  return { ok: true };
}

function close() {
  if (isOpen()) win.destroy();
}

module.exports = { open, close, owns, parsePhone };
