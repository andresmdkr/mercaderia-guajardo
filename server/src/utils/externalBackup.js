// Copia externa (opcional): además de guardar cada copia de seguridad en la carpeta de esta PC, se copia a otra
// carpeta elegida por el usuario (un pendrive, Google Drive, Dropbox...). Así, si el disco de la PC falla, los datos
// se conservan. Es una RECOMENDACIÓN: si no se configura, o la carpeta no está disponible (pendrive desconectado),
// la aplicación funciona igual y solo se muestra una advertencia.
//
// La configuración y el estado de la última copia se guardan en un archivo junto a las copias de seguridad.
const fs = require('node:fs');
const path = require('node:path');
const AppError = require('./AppError');
const { backupDir, isValidBackupName } = require('./backupTools');

const CONFIG_NAME = 'copia-externa.json';
const STALE_DAYS = 7; // pasado este tiempo sin copiar a la carpeta externa, se advierte

const configFile = () => path.join(backupDir(), CONFIG_NAME);
const keepCount = () => Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

function readConfig() {
  try {
    const saved = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
    return { folder: saved.folder ?? null, lastCopyAt: saved.lastCopyAt ?? null, lastError: saved.lastError ?? null };
  } catch {
    return { folder: null, lastCopyAt: null, lastError: null };
  }
}

function writeConfig(config) {
  fs.mkdirSync(backupDir(), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(config, null, 2));
}

// Estado para mostrar en pantalla:
//   none    → no hay carpeta externa configurada (advertencia)
//   error   → la última copia falló (advertencia)
//   stale   → hace más de STALE_DAYS días que no se copia (advertencia)
//   pending → configurada, todavía no se hizo ninguna copia
//   ok      → todo en orden
function status(now = new Date()) {
  const { folder, lastCopyAt, lastError } = readConfig();
  let state = 'ok';
  let daysSinceCopy = null;
  if (lastCopyAt) daysSinceCopy = Math.floor((now - new Date(lastCopyAt)) / (24 * 60 * 60 * 1000));
  if (!folder) state = 'none';
  else if (lastError) state = 'error';
  else if (!lastCopyAt) state = 'pending';
  else if (daysSinceCopy >= STALE_DAYS) state = 'stale';
  return { folder, lastCopyAt, lastError, state, daysSinceCopy, warning: ['none', 'error', 'stale'].includes(state) };
}

// Mensaje entendible para el usuario a partir del error del sistema.
function friendlyError(error) {
  if (['ENOENT', 'ENXIO', 'ENODEV'].includes(error.code)) return 'La carpeta no está disponible (¿está conectado el pendrive?)';
  if (['EACCES', 'EPERM', 'EROFS'].includes(error.code)) return 'No hay permiso para escribir en esa carpeta';
  if (error.code === 'ENOSPC') return 'No hay espacio libre en esa carpeta';
  return `No se pudo copiar: ${error.message}`;
}

// Deja solo las últimas `keep` copias en la carpeta externa (solo toca archivos con nombre de copia de seguridad).
function rotateExternal(folder, keep) {
  const files = fs.readdirSync(folder).filter((name) => isValidBackupName(name)).sort().reverse();
  files.slice(keep).forEach((name) => fs.rmSync(path.join(folder, name), { force: true }));
}

// Copia un archivo de backup a la carpeta externa. NUNCA lanza error: el resultado queda anotado para mostrarlo.
async function copyToExternal(file) {
  const config = readConfig();
  if (!config.folder) return { copied: false };

  try {
    const target = path.join(config.folder, path.basename(file));
    // Se copia con un nombre temporal y recién al terminar se renombra: si se desconecta el pendrive a mitad de
    // camino no queda una copia a medias con nombre de copia buena.
    fs.copyFileSync(file, `${target}.copiando`);
    fs.renameSync(`${target}.copiando`, target);
    rotateExternal(config.folder, keepCount());
    writeConfig({ ...config, lastCopyAt: new Date().toISOString(), lastError: null });
    return { copied: true };
  } catch (error) {
    fs.rmSync(`${path.join(config.folder, path.basename(file))}.copiando`, { force: true });
    writeConfig({ ...config, lastError: friendlyError(error) });
    return { copied: false, error: friendlyError(error) };
  }
}

// Elige (o quita, con null) la carpeta externa. Comprueba que exista y se pueda escribir. Si ya hay copias en esta
// PC, copia la más nueva enseguida para que el estado quede al día.
async function setFolder(folder, { newestBackup } = {}) {
  if (folder === null || folder === '') {
    writeConfig({ folder: null, lastCopyAt: null, lastError: null });
    return status();
  }
  if (typeof folder !== 'string' || !path.isAbsolute(folder)) throw new AppError('Indicá la ruta completa de la carpeta');
  const resolved = path.resolve(folder);
  if (resolved === path.resolve(backupDir())) throw new AppError('Elegí una carpeta distinta a la de las copias de esta computadora');

  let stat;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new AppError('Esa carpeta no existe o no está disponible');
  }
  if (!stat.isDirectory()) throw new AppError('La ruta indicada no es una carpeta');
  const probe = path.join(resolved, `.prueba-escritura-${process.pid}`);
  try {
    fs.writeFileSync(probe, 'ok');
    fs.rmSync(probe, { force: true });
  } catch (error) {
    throw new AppError(friendlyError(error));
  }

  writeConfig({ folder: resolved, lastCopyAt: null, lastError: null });
  if (newestBackup) await copyToExternal(newestBackup);
  return status();
}

module.exports = { status, setFolder, copyToExternal, STALE_DAYS };
