// Ejecutor de migraciones propio (reemplaza a sequelize-cli, que no existe dentro de la app de escritorio).
// Usa los mismos archivos de /migrations ({ up, down }) y la misma tabla de control ("SequelizeMeta").
// Cada migración corre dentro de una transacción: si falla, la base queda como estaba.
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize } = require('sequelize');

const MIGRATIONS_DIR = path.resolve(process.env.MIGRATIONS_DIR ?? path.join(__dirname, '..', '..', 'migrations'));

const migrationFiles = () =>
  fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort();

async function appliedMigrations(sequelize) {
  await sequelize.query('CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) NOT NULL PRIMARY KEY)');
  const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
  return rows.map((row) => row.name);
}

async function pendingMigrations(sequelize) {
  const applied = new Set(await appliedMigrations(sequelize));
  return migrationFiles().filter((file) => !applied.has(file));
}

/**
 * Aplica las migraciones que falten. `beforeMigrate(pending, applied)` se llama antes de tocar nada
 * (la app lo usa para hacer un backup si la base ya tenía datos). Devuelve los nombres aplicados.
 */
async function migrateUp(sequelize, { beforeMigrate } = {}) {
  const applied = await appliedMigrations(sequelize);
  const pending = migrationFiles().filter((file) => !applied.includes(file));
  if (pending.length === 0) return [];

  if (beforeMigrate) await beforeMigrate(pending, applied);

  for (const name of pending) {
    const migration = require(path.join(MIGRATIONS_DIR, name));
    await sequelize.transaction(async (transaction) => {
      await migration.up(sequelize.getQueryInterface(), Sequelize, { transaction });
      await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:name)', { replacements: { name }, transaction });
    });
  }
  return pending;
}

// Deshace la última migración aplicada. Devuelve su nombre (o null si no hay ninguna).
async function migrateDown(sequelize) {
  const applied = await appliedMigrations(sequelize);
  const last = applied[applied.length - 1];
  if (!last) return null;

  const migration = require(path.join(MIGRATIONS_DIR, last));
  await sequelize.transaction(async (transaction) => {
    await migration.down(sequelize.getQueryInterface(), Sequelize, { transaction });
    await sequelize.query('DELETE FROM "SequelizeMeta" WHERE name = :name', { replacements: { name: last }, transaction });
  });
  return last;
}

module.exports = { appliedMigrations, pendingMigrations, migrateUp, migrateDown };
