'use strict';
// Puente entre la pantalla (React) y la app de escritorio. Es lo ÚNICO que la pantalla puede pedirle al sistema:
// cada función corresponde a una acción concreta que valida main.js (la pantalla no recibe Node ni Electron).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  openBackupsFolder: () => ipcRenderer.invoke('desktop:open-backups-folder'),
  restoreBackup: (name) => ipcRenderer.invoke('desktop:restore-backup', String(name)),
  getUpdateStatus: () => ipcRenderer.invoke('desktop:get-update-status'),
  checkForUpdates: () => ipcRenderer.invoke('desktop:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('desktop:install-update'),
  copyDiagnostics: () => ipcRenderer.invoke('desktop:copy-diagnostics'),
  onUpdateStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('desktop:update-status', listener);
    return () => ipcRenderer.removeListener('desktop:update-status', listener);
  },
});
