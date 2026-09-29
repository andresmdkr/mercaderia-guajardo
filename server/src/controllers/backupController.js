const path = require('node:path');
const { sequelize } = require('../db');
const { backupDir, createBackup, listBackups, rotateBackups } = require('../utils/backupTools');

const KEEP = () => Number.parseInt(process.env.BACKUP_KEEP ?? '30', 10);

const toItem = ({ file, size, createdAt, kind }) => ({ name: file, size, createdAt, kind });

// Copias de seguridad disponibles (de la más nueva a la más vieja) y la carpeta donde están.
function list() {
  return { folder: backupDir(), items: listBackups().map(toItem) };
}

// Copia hecha a mano desde la pantalla (con la app abierta). Devuelve la copia nueva.
async function create() {
  const file = await createBackup(sequelize);
  rotateBackups(KEEP());
  return toItem(listBackups().find((backup) => backup.file === path.basename(file)));
}

module.exports = { list, create };
