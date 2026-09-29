'use strict';
// Enviar un comprobante por WhatsApp: los enlaces de WhatsApp permiten abrir un chat pero no adjuntar un archivo.
// Por eso el PDF se guarda en una carpeta y se deja copiado en el portapapeles de Windows como archivo (igual que
// "Copiar" en el Explorador): en el chat solo hay que pegarlo (Ctrl+V) y tocar Enviar.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const FILE_NAME = /^comprobante-\d{4}-\d{8}\.pdf$/; // comprobante-0001-00000012.pdf: lo arma la pantalla, nunca una ruta
const MAX_BYTES = 5 * 1024 * 1024;
const KEEP = 30; // se conservan los últimos comprobantes; los más viejos se borran solos
const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');

// Guarda el PDF (llega en base64 desde la pantalla). Devuelve la ruta del archivo o tira un Error con el motivo.
function saveReceipt(dir, filename, base64) {
  if (typeof filename !== 'string' || !FILE_NAME.test(filename)) throw new Error('Nombre de comprobante no válido');
  if (typeof base64 !== 'string' || base64.length === 0 || !/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error('Comprobante no válido');
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new Error('El comprobante es demasiado grande');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('El comprobante no es un PDF');

  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, filename);
  fs.writeFileSync(file, bytes);

  // Limpieza: quedan los KEEP más nuevos
  const files = fs
    .readdirSync(dir)
    .filter((name) => FILE_NAME.test(name))
    .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);
  for (const old of files.slice(KEEP)) fs.rmSync(path.join(dir, old.name), { force: true });
  return file;
}

// Deja el archivo en el portapapeles como una copia de archivo de Windows (se pega en WhatsApp con Ctrl+V).
// Usa PowerShell (viene con Windows, también el 8.1). La ruta viaja en una variable de entorno, no en el comando.
function copyFileToClipboard(file) {
  const script =
    'Add-Type -AssemblyName System.Windows.Forms; ' +
    '$files = New-Object System.Collections.Specialized.StringCollection; [void]$files.Add($env:MG_RECEIPT_FILE); ' +
    '$data = New-Object System.Windows.Forms.DataObject; $data.SetFileDropList($files); ' +
    '[System.Windows.Forms.Clipboard]::SetDataObject($data, $true)'; // true = queda en el portapapeles aunque este proceso termine
  return new Promise((resolve) => {
    let finished = false;
    const done = (result) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    try {
      const child = spawn(POWERSHELL, ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-Command', script], {
        env: { ...process.env, MG_RECEIPT_FILE: file },
        windowsHide: true,
        shell: false,
        stdio: 'ignore',
      });
      const timer = setTimeout(() => {
        child.kill();
        done({ ok: false, message: 'Windows tardó demasiado en copiar el archivo' });
      }, 20000);
      child.once('error', (error) => {
        clearTimeout(timer);
        done({ ok: false, message: error.message });
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        done(code === 0 ? { ok: true } : { ok: false, message: `No se pudo copiar el archivo (código ${code})` });
      });
    } catch (error) {
      done({ ok: false, message: error.message });
    }
  });
}

module.exports = { saveReceipt, copyFileToClipboard };
