'use strict';
// Actualizaciones automáticas desde GitHub Releases (electron-updater). Solo funcionan en la versión instalada.

const { app } = require('electron');

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // la PC del negocio puede quedar prendida días

let autoUpdater = null;
let status = { status: 'idle', message: '' };
let listeners = [];
let log = () => {};

function set(next, message) {
  status = { status: next, message };
  log(`actualización: ${next} - ${message}`);
  listeners.forEach((listener) => listener(status, next));
}

// `onChange(status)` se llama en cada cambio (la ventana y los avisos lo usan).
function setup({ onChange, logger }) {
  log = logger;
  listeners = [onChange];
  if (!app.isPackaged) {
    set('disabled', 'Las actualizaciones solo funcionan en la versión instalada.');
    return;
  }
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (error) {
    set('error', `No se pudo cargar el actualizador: ${error.message}`);
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true; // si no reinicia ahora, se instala al cerrar
  autoUpdater.on('checking-for-update', () => set('checking', 'Buscando actualizaciones...'));
  autoUpdater.on('update-available', (info) => set('downloading', `Hay una versión nueva (${info.version}). Descargando...`));
  autoUpdater.on('update-not-available', () => set('none', `Ya tenés la última versión (${app.getVersion()}).`));
  autoUpdater.on('download-progress', (progress) => set('downloading', `Descargando la actualización: ${Math.round(progress.percent)}%`));
  autoUpdater.on('update-downloaded', (info) => set('ready', `La versión ${info.version} está lista para instalar.`));
  autoUpdater.on('error', (error) => set('error', `No se pudo actualizar: ${error && error.message ? error.message : error}`));
  set('idle', 'Todavía no se buscaron actualizaciones.');

  setInterval(check, CHECK_EVERY_MS).unref();
}

function check() {
  if (!autoUpdater) return;
  if (status.status === 'checking' || status.status === 'downloading' || status.status === 'ready') return;
  autoUpdater.checkForUpdates().catch((error) => set('error', `No se pudo buscar actualizaciones: ${error.message}`));
}

function install() {
  if (autoUpdater && status.status === 'ready') setImmediate(() => autoUpdater.quitAndInstall(true, true));
}

const getStatus = () => status;

module.exports = { setup, check, install, getStatus };
