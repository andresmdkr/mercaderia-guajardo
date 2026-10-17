'use strict';
// Puente de la pantalla de "cómo se usa esta computadora" (setup.html). Solo sirve a esa página: main.js comprueba
// que el pedido venga de ella. Es independiente del puente de la aplicación (preload.js).

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', {
  getState: () => ipcRenderer.invoke('setup:get-state'),
  useAsMain: () => ipcRenderer.invoke('setup:use-main'),
  connect: (address) => ipcRenderer.invoke('setup:connect', String(address)),
  retry: () => ipcRenderer.invoke('setup:retry'),
  quit: () => ipcRenderer.invoke('setup:quit'),
});
