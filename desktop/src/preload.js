'use strict';
// Puente entre la pantalla (React) y la app de escritorio. Es lo ÚNICO que la pantalla puede pedirle al sistema:
// cada función corresponde a una acción concreta que valida main.js (la pantalla no recibe Node ni Electron).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  openBackupsFolder: () => ipcRenderer.invoke('desktop:open-backups-folder'),
  restoreBackup: (name) => ipcRenderer.invoke('desktop:restore-backup', String(name)),
  enterDemo: () => ipcRenderer.invoke('desktop:enter-demo'),
  exitDemo: (fresh) => ipcRenderer.invoke('desktop:exit-demo', fresh === true),
  openWhatsapp: (url) => ipcRenderer.invoke('desktop:open-whatsapp', String(url)),
  shareWhatsappFile: (payload) => ipcRenderer.invoke('desktop:share-whatsapp-file', payload),
  getWhatsappSettings: () => ipcRenderer.invoke('desktop:get-whatsapp-settings'),
  chooseWhatsappProgram: () => ipcRenderer.invoke('desktop:choose-whatsapp-program'),
  setWhatsappOption: (name, value) => ipcRenderer.invoke('desktop:set-whatsapp-option', String(name), value === true),
  setWhatsappMode: (mode) => ipcRenderer.invoke('desktop:set-whatsapp-mode', String(mode)),
  getUpdateStatus: () => ipcRenderer.invoke('desktop:get-update-status'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  chooseFolder: () => ipcRenderer.invoke('desktop:choose-folder'),
  printHtml: (html) => ipcRenderer.invoke('desktop:print-html', String(html)),
  copyDiagnostics: () => ipcRenderer.invoke('desktop:copy-diagnostics'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('desktop:update-status', listener);
    return () => ipcRenderer.removeListener('desktop:update-status', listener);
  },
});
