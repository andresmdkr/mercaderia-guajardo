// Prueba el backup automático con las conexiones de la propia aplicación: hace uno, no repite si es reciente,
// vuelve a hacer uno cuando el último es viejo y conserva solo los últimos. Imprime el resultado como JSON.
const fs = require('node:fs');
const { sequelize } = require('../../src/db');
const { backupDir, backupIfDue, listBackups } = require('../../src/utils/backupTools');
const { migrateUp } = require('../../src/utils/migrator');

(async () => {
  await migrateUp(sequelize);
  const first = await backupIfDue(sequelize, { maxAgeHours: 20, keep: 2 });
  const second = await backupIfDue(sequelize, { maxAgeHours: 20, keep: 2 }); // recién hecho: no toca

  // Se envejece el último backup 25 horas, como si hubiera pasado un día.
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  for (const backup of listBackups()) fs.utimesSync(backup.path, old, old);
  await new Promise((resolve) => setTimeout(resolve, 1100)); // el nombre lleva segundos: que no se repita
  const third = await backupIfDue(sequelize, { maxAgeHours: 20, keep: 2 });

  console.log(`RESULTADO ${JSON.stringify({
    firstCreated: Boolean(first),
    firstKind: listBackups().find((b) => first && first.endsWith(b.file))?.kind,
    secondSkipped: second === null,
    thirdCreated: Boolean(third),
    remaining: listBackups().length,
    folder: backupDir(),
  })}`);
  await sequelize.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
