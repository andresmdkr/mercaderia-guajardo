'use strict';
// Imprime un documento HTML (el comprobante) con el diálogo de impresión de Windows.
// Se carga en una ventana oculta, sin scripts: solo se muestra el documento tal cual.
// (Imprimir la ventana del visor de PDF sale en blanco, por eso el comprobante se imprime como HTML.)

const { BrowserWindow } = require('electron');

const MAX_HTML_LENGTH = 2 * 1024 * 1024;

// `deviceName` (opcional) imprime directo en esa impresora, sin diálogo: solo lo usan las pruebas.
// Devuelve { ok, cancelled?, message? }.
function printHtml(html, { parent, deviceName } = {}) {
  return new Promise((resolve) => {
    if (typeof html !== 'string' || html.length === 0 || html.length > MAX_HTML_LENGTH) {
      return resolve({ ok: false, message: 'El documento a imprimir no es válido' });
    }

    const win = new BrowserWindow({
      show: false,
      parent,
      webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    const finish = (result) => {
      if (!win.isDestroyed()) win.destroy();
      resolve(result);
    };

    win.webContents.once('did-fail-load', (_event, _code, description) => finish({ ok: false, message: `No se pudo preparar la impresión: ${description}` }));
    win.webContents.once('did-finish-load', () => {
      win.webContents.print({ silent: Boolean(deviceName), deviceName, printBackground: true }, (success, reason) => {
        if (success) return finish({ ok: true });
        // Cerrar el diálogo con "Cancelar" no es un error.
        const cancelled = /cancel/i.test(reason ?? '');
        finish({ ok: false, cancelled, message: cancelled ? undefined : `No se pudo imprimir: ${reason || 'error desconocido'}` });
      });
    });
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

module.exports = { printHtml };
