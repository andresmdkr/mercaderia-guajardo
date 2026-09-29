// Uso: npm run restore                    → lista los backups disponibles
//      npm run restore -- <archivo>       → restaura ese backup (pide confirmación)
//      npm run restore -- <archivo> --yes → restaura sin preguntar
// IMPORTANTE: cerrá la aplicación / el servidor antes de restaurar.
// Antes de reemplazar la base se guarda una copia del estado actual ("antes-de-restaurar").
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { DB_FILE, sequelize } = require('../db');
const { backupDir, checkBackupFile, createBackup, formatSize, listBackups, replaceDatabaseFile } = require('../utils/backupTools');

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

// Acepta una ruta completa, relativa, o solo el nombre del archivo dentro de la carpeta de backups.
function resolveBackupFile(input) {
  return [path.resolve(input), path.join(backupDir(), input)].find((candidate) => fs.existsSync(candidate));
}

async function main() {
  const [input, ...flags] = process.argv.slice(2);

  if (!input) {
    const backups = listBackups();
    if (backups.length === 0) return console.log(`No hay backups en ${backupDir()}. Creá uno con: npm run backup`);
    console.log(`Backups disponibles en ${backupDir()} (del más nuevo al más viejo):\n`);
    backups.forEach((backup) => console.log(`  ${backup.file}  (${formatSize(backup.size)})`));
    return console.log('\nPara restaurar uno: npm run restore -- <nombre del archivo>');
  }

  const file = resolveBackupFile(input);
  if (!file) throw new Error(`No se encontró el backup "${input}"`);
  await checkBackupFile(file);

  if (!flags.includes('--yes')) {
    console.log(`Se va a REEMPLAZAR toda la base actual (${DB_FILE}) por el backup:\n  ${file}\n`);
    console.log('Cerrá la aplicación antes de continuar.');
    const answer = await ask('Escribí RESTAURAR para continuar: ');
    if (answer !== 'RESTAURAR') return console.log('Cancelado. No se cambió nada.');
  }

  if (fs.existsSync(DB_FILE)) {
    console.log(`Copia de seguridad del estado actual: ${await createBackup(sequelize, 'antes-de-restaurar')}`);
  }
  await sequelize.close();

  replaceDatabaseFile(DB_FILE, file);
  console.log('Restauración completa. Al abrir la aplicación se aplican las migraciones que falten.');
}

main()
  .catch((error) => {
    console.error('No se pudo restaurar:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close().catch(() => {}));
