// Uso: npm run restore                    → lista los backups disponibles
//      npm run restore -- <archivo>       → restaura ese backup (pide confirmación)
//      npm run restore -- <archivo> --yes → restaura sin preguntar
// Antes de restaurar se hace un backup automático del estado actual ("antes-de-restaurar"),
// y la restauración es todo-o-nada: si algo falla, la base queda como estaba.
require('dotenv').config();
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { backupDir, connection, findPostgresTool, formatSize, listBackups } = require('../utils/postgresTools');
const { createBackup } = require('./backup');

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
  const candidates = [path.resolve(input), path.join(backupDir(), input)];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function main() {
  const { args, env, dbName } = connection();
  const [input, ...flags] = process.argv.slice(2);

  if (!input) {
    const backups = listBackups(backupDir(), dbName);
    if (backups.length === 0) return console.log(`No hay backups en ${backupDir()}. Creá uno con: npm run backup`);
    console.log(`Backups disponibles en ${backupDir()} (del más nuevo al más viejo):\n`);
    backups.forEach((backup) => console.log(`  ${backup.file}  (${formatSize(backup.size)})`));
    return console.log('\nPara restaurar uno: npm run restore -- <nombre del archivo>');
  }

  const file = resolveBackupFile(input);
  if (!file) throw new Error(`No se encontró el backup "${input}"`);

  const pgRestore = findPostgresTool('pg_restore');
  const check = spawnSync(pgRestore, ['--list', file], { encoding: 'utf8' });
  if (check.status !== 0) throw new Error('El archivo no es un backup válido de PostgreSQL');

  if (!flags.includes('--yes')) {
    console.log(`Se va a REEMPLAZAR todo el contenido de la base "${dbName}" por el del backup:\n  ${file}\n`);
    const answer = await ask('Escribí RESTAURAR para continuar: ');
    if (answer !== 'RESTAURAR') return console.log('Cancelado. No se cambió nada.');
  }

  const safety = createBackup('antes-de-restaurar');
  console.log(`Copia de seguridad del estado actual: ${safety}`);

  // --clean --if-exists: reemplaza las tablas actuales; --single-transaction: todo o nada
  const result = spawnSync(pgRestore, [...args, '--clean', '--if-exists', '--no-owner', '--single-transaction', file], {
    env,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`${result.stderr?.trim() || 'pg_restore falló'}\nLa base quedó como estaba. Copia previa: ${safety}`);
  }
  console.log('Restauración completa.');
}

main().catch((error) => {
  console.error('No se pudo restaurar:', error.message);
  process.exitCode = 1;
});
