// Uso: npm run restore                    → lista los backups disponibles
//      npm run restore -- <archivo>       → restaura ese backup (pide confirmación)
//      npm run restore -- <archivo> --yes → restaura sin preguntar
// IMPORTANTE: cerrá la aplicación / el servidor antes de restaurar.
// Antes de reemplazar la base se guarda una copia del estado actual ("antes-de-restaurar").
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const sqlite3 = require('sqlite3');
const { DB_FILE, sequelize } = require('../db');
const { backupDir, createBackup, formatSize, listBackups, looksLikeSqlite } = require('../utils/backupTools');

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

// Abre el backup en modo solo lectura y comprueba que la base esté sana y tenga las tablas del negocio.
function checkBackup(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(new Error(`No se pudo abrir el backup: ${openError.message}`));
      db.get('PRAGMA integrity_check', (error, row) => {
        if (error || row.integrity_check !== 'ok') {
          db.close();
          return reject(new Error('El backup está dañado (falló la verificación de integridad)'));
        }
        db.get("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('products', 'sales', 'users')", (error2, tables) => {
          db.close();
          if (error2 || tables.n !== 3) return reject(new Error('El archivo es una base SQLite, pero no es de esta aplicación'));
          resolve();
        });
      });
    });
  });
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
  if (!looksLikeSqlite(file)) throw new Error('El archivo no es un backup válido (no es una base SQLite; ¿es un .dump viejo de PostgreSQL?)');
  await checkBackup(file);

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

  // Se copia a un archivo temporal y recién después se reemplaza: nunca queda una base a medias.
  const temp = `${DB_FILE}.restaurando`;
  fs.copyFileSync(file, temp);
  for (const extra of ['-wal', '-shm']) fs.rmSync(`${DB_FILE}${extra}`, { force: true });
  fs.renameSync(temp, DB_FILE);
  console.log('Restauración completa. Al abrir la aplicación se aplican las migraciones que falten.');
}

main()
  .catch((error) => {
    console.error('No se pudo restaurar:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close().catch(() => {}));
