const path = require('node:path');
const { sequelize } = require('../db');
const { backupDir, createBackup, listBackups, rotateBackups } = require('../utils/backupTools');
const externalBackup = require('../utils/externalBackup');

const KEEP = () => Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

const toItem = ({ file, size, createdAt, kind }) => ({ name: file, size, createdAt, kind });

// Copias de seguridad disponibles (de la más nueva a la más vieja) y la carpeta donde están.
function list() {
  return { folder: backupDir(), items: listBackups().map(toItem), external: externalBackup.status() };
}

// Copia hecha a mano desde la pantalla (con la app abierta). Devuelve la copia nueva.
async function create() {
  const file = await createBackup(sequelize);
  rotateBackups(KEEP());
  return toItem(listBackups().find((backup) => backup.file === path.basename(file)));
}

// Estado de la copia externa (opcional): carpeta, última copia y si hay que mostrar una advertencia.
const externalStatus = () => externalBackup.status();

// Elige o quita (null) la carpeta externa.
const setExternalFolder = (folder) => externalBackup.setFolder(folder, { newestBackup: listBackups()[0]?.path });

module.exports = { list, create, externalStatus, setExternalFolder };
