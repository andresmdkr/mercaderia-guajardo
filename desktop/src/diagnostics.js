'use strict';
// Informe de diagnóstico: un texto con los datos de la PC y de la aplicación, para pegar en un mensaje
// cuando algo no anda ("Configuración → Copiar informe de diagnóstico"). Nunca incluye datos del negocio.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const toMB = (bytes) => `${Math.round(bytes / 1024 / 1024)} MB`;

// El Node de Electron 22 llama "Windows 10" a Windows 11 (su número de versión 10.0 no cambió): se distingue por la compilación.
function windowsName() {
  const build = Number.parseInt(os.release().split('.')[2] ?? '0', 10);
  return build >= 22000 ? os.version().replace('Windows 10', 'Windows 11') : os.version();
}

function fileSize(file) {
  try {
    return toMB(fs.statSync(file).size);
  } catch {
    return 'no existe';
  }
}

function lastLines(file, count) {
  try {
    return fs.readFileSync(file, 'utf8').trimEnd().split('\n').slice(-count).join('\n');
  } catch {
    return '(sin registro)';
  }
}

function backupsSummary(dir) {
  try {
    const files = fs.readdirSync(dir).filter((name) => name.endsWith('.sqlite'));
    return `${files.length} en ${dir}`;
  } catch {
    return `0 en ${dir}`;
  }
}

function buildReport({ app, server, update, logFile }) {
  const { electron, chrome, node } = process.versions;
  const used = app.getAppMetrics().reduce((sum, metric) => sum + metric.memory.workingSetSize * 1024, 0);
  const lines = [
    `Mercadería Guajardo ${app.getVersion()} (${app.isPackaged ? 'instalada' : 'desarrollo'})`,
    `Sistema: ${windowsName()} (${os.release()}) · proceso de ${process.arch === 'ia32' ? '32' : '64'} bits · procesador ${os.arch()}`,
    `Motor: Electron ${electron} · Chromium ${chrome} · Node ${node}`,
    `Memoria: total ${toMB(os.totalmem())} · libre ${toMB(os.freemem())} · la aplicación usa ${toMB(used)}`,
    `Fecha y hora: ${new Date().toLocaleString('es-AR')} (zona ${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    `Servidor local: ${server.origin ?? 'no iniciado'}`,
    `Base de datos: ${server.dbFile ?? '—'} (${server.dbFile ? fileSize(server.dbFile) : '—'})`,
    `Copias de seguridad: ${server.backupsDir ? backupsSummary(server.backupsDir) : '—'}`,
    `Actualizaciones: ${update.status} - ${update.message}`,
    '',
    'Últimas líneas del registro:',
    lastLines(logFile, 40),
  ];
  return lines.join('\n');
}

const logPath = (userData) => path.join(userData, 'registro.txt');

module.exports = { buildReport, logPath };
