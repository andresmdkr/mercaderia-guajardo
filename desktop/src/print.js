'use strict';
// Impresión del comprobante (HTML) con el diálogo de impresión de Windows.
//
// El diálogo de Windows puede caerse por completo en algunas PC (por ejemplo, sin ninguna impresora instalada, en
// Windows 8.1, el programa se cerraba con "la instrucción hace referencia a la memoria..."). Por eso la impresión
// NO se hace en la aplicación principal: se lanza una segunda copia del programa que solo imprime (--print-job) y,
// pase lo que pase ahí, la aplicación principal sigue abierta y muestra un aviso.
// (Imprimir la ventana del visor de PDF sale en blanco, por eso el comprobante se imprime como HTML.)

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { BrowserWindow, app } = require('electron');

const MAX_HTML_LENGTH = 2 * 1024 * 1024;
const NO_PRINTERS = 'No hay ninguna impresora instalada en esta computadora. Instalá una, o usá "Comprobante PDF" para guardarlo o abrirlo.';
const CRASHED = 'No se pudo abrir la impresión en esta computadora. Usá "Comprobante PDF" para guardarlo o abrirlo.';

const isValidHtml = (html) => typeof html === 'string' && html.length > 0 && html.length <= MAX_HTML_LENGTH;

// --- Lado del proceso que imprime ---
// Imprime `html` con el diálogo de Windows. `deviceName` (opcional) imprime directo en esa impresora, sin diálogo:
// solo lo usan las pruebas. Devuelve { ok, cancelled?, message? }.
function printHtml(html, { deviceName } = {}) {
  return new Promise((resolve) => {
    if (!isValidHtml(html)) return resolve({ ok: false, message: 'El documento a imprimir no es válido' });

    const win = new BrowserWindow({
      show: false,
      webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    const finish = (result) => {
      if (!win.isDestroyed()) win.destroy();
      resolve(result);
    };

    win.webContents.once('did-fail-load', (_event, _code, description) => finish({ ok: false, message: `No se pudo preparar la impresión: ${description}` }));
    win.webContents.once('did-finish-load', async () => {
      // Sin impresoras el diálogo de Windows se cae: se avisa antes de abrirlo.
      const printers = await win.webContents.getPrintersAsync().catch(() => []);
      if (printers.length === 0) return finish({ ok: false, message: NO_PRINTERS });

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

// Se ejecuta dentro de la segunda copia del programa: lee el trabajo, imprime y deja el resultado en un archivo.
async function runPrintJob(jobFile) {
  const resultFile = path.join(path.dirname(jobFile), 'result.json');
  let result;
  try {
    const job = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
    result = await printHtml(fs.readFileSync(job.htmlFile, 'utf8'), { deviceName: job.deviceName });
  } catch (error) {
    result = { ok: false, message: `No se pudo imprimir: ${error.message}` };
  }
  fs.writeFileSync(resultFile, JSON.stringify(result));
  app.exit(0);
}

// --- Lado de la aplicación principal ---
// Lanza la segunda copia y espera su resultado. Si esa copia se cae, devuelve un aviso (y la aplicación sigue viva).
function printInChildProcess(html, { log = () => {}, deviceName } = {}) {
  return new Promise((resolve) => {
    if (!isValidHtml(html)) return resolve({ ok: false, message: 'El documento a imprimir no es válido' });

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-print-'));
    const jobFile = path.join(dir, 'job.json');
    const htmlFile = path.join(dir, 'receipt.html');
    fs.writeFileSync(htmlFile, html);
    fs.writeFileSync(jobFile, JSON.stringify({ htmlFile, deviceName }));

    const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const args = [...(app.isPackaged ? [] : [app.getAppPath()]), `--print-job=${jobFile}`];
    log('impresión: se lanza el proceso de impresión');

    let child;
    try {
      child = spawn(process.execPath, args, { stdio: 'ignore', env });
    } catch (error) {
      cleanup();
      log(`ERROR de impresión al lanzar el proceso: ${error.message}`);
      return resolve({ ok: false, message: CRASHED });
    }
    child.once('error', (error) => {
      cleanup();
      log(`ERROR de impresión al lanzar el proceso: ${error.message}`);
      resolve({ ok: false, message: CRASHED });
    });
    child.once('exit', (code, signal) => {
      let result;
      try {
        result = JSON.parse(fs.readFileSync(path.join(dir, 'result.json'), 'utf8'));
      } catch {
        // No dejó resultado: el proceso de impresión se cayó (ya no arrastra a la aplicación principal).
        log(`ERROR de impresión: el proceso terminó sin resultado (código ${code}, señal ${signal})`);
        result = { ok: false, message: CRASHED };
      }
      cleanup();
      log(`impresión: ${result.ok ? 'ok' : result.cancelled ? 'cancelada' : `sin imprimir - ${result.message}`}`);
      resolve(result);
    });
  });
}

module.exports = { printHtml, printInChildProcess, runPrintJob };
