const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

const SERVER_DIR = path.join(__dirname, '..');
const NODE_BIN = process.env.TEST_NODE_BIN || process.execPath;

// Ejecuta un script del servidor con el Node de las pruebas (o el de Electron) y una base temporal.
function runScript(script, args, env, input) {
  return spawnSync(NODE_BIN, [path.join(SERVER_DIR, script), ...args], {
    cwd: SERVER_DIR,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', JWT_SECRET: 'x', NODE_ENV: '', ...env },
    input,
    encoding: 'utf8',
  });
}

describe('base de datos SQLite', () => {
  it('las conexiones de la aplicación tienen activadas las claves foráneas', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-fk-'));
    try {
      const result = runScript('tests/helpers/fk-check.js', [], { DB_FILE: path.join(dir, 'fk.sqlite') });
      assert.equal(result.status, 0, result.stderr);
      const outcome = JSON.parse(/RESULTADO (.*)/.exec(result.stdout)[1]);
      assert.deepEqual(outcome, { pragma: 1, rejected: true, stillThere: true });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('migrar, deshacer y volver a migrar funciona y es repetible', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-mig-'));
    const env = { DB_FILE: path.join(dir, 'mig.sqlite') };
    try {
      const up = runScript('src/scripts/migrate.js', ['up'], env);
      assert.match(up.stdout, /Aplicadas: 20260929000000-baseline\.js/, up.stderr);
      assert.match(runScript('src/scripts/migrate.js', ['up'], env).stdout, /No hay migraciones pendientes/);
      assert.match(runScript('src/scripts/migrate.js', ['status'], env).stdout, /Pendientes: \(ninguna\)/);
      assert.match(runScript('src/scripts/migrate.js', ['down'], env).stdout, /Deshecha: 20260929000000-baseline\.js/);
      assert.match(runScript('src/scripts/migrate.js', ['down'], env).stdout, /No hay migraciones para deshacer/);
      assert.match(runScript('src/scripts/migrate.js', ['up'], env).stdout, /Aplicadas/);
      assert.notEqual(runScript('src/scripts/migrate.js', ['rara'], env).status, 0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('una actualización con cambios de esquema hace un backup antes de migrar y conserva los datos', async () => {
    // Carpeta de migraciones de prueba: la base y, más tarde, una migración "nueva" (como en una actualización).
    const migrations = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-migrations-'));
    fs.copyFileSync(path.join(SERVER_DIR, 'migrations', '20260929000000-baseline.js'), path.join(migrations, '20260929000000-baseline.js'));

    const first = await startTestServer({ MIGRATIONS_DIR: migrations });
    const { dir } = first;
    try {
      const api = first.client();
      await loginAsAdmin(api);
      await product(api, 'M1', 10, 5, 4);
      assert.equal(first.output().includes('antes-de-migrar'), false, 'base nueva: no hace falta backup');
      await first.close({ keep: true });

      fs.writeFileSync(
        path.join(migrations, '20260930000000-agrega-tabla.js'),
        `module.exports = {
          async up(queryInterface, Sequelize, { transaction }) { await queryInterface.sequelize.query('CREATE TABLE notas (id INTEGER PRIMARY KEY, texto TEXT)', { transaction }); },
          async down(queryInterface, Sequelize, { transaction }) { await queryInterface.sequelize.query('DROP TABLE notas', { transaction }); },
        };`
      );

      const second = await startTestServer({ MIGRATIONS_DIR: migrations }, { dir });
      try {
        assert.match(second.output(), /Backup previo a migrar/);
        assert.match(second.output(), /Migraciones aplicadas: 20260930000000-agrega-tabla\.js/);
        const backups = fs.readdirSync(second.backupDir).filter((f) => f.includes('antes-de-migrar'));
        assert.equal(backups.length, 1);
        assert.ok(second.db, 'la base sigue abierta');
        assert.ok(await second.db.get("SELECT name FROM sqlite_master WHERE name = 'notas'"), 'la tabla nueva existe');
        assert.equal((await second.db.get('SELECT COUNT(*) AS n FROM products')).n, 1, 'los datos siguen ahí');

        // El backup previo tiene el estado ANTERIOR a la migración.
        const { openDatabase } = require('./helpers/testServer');
        const old = openDatabase(path.join(second.backupDir, backups[0]));
        assert.equal(await old.get("SELECT name FROM sqlite_master WHERE name = 'notas'"), undefined, 'el backup no tiene la tabla nueva');
        assert.equal((await old.get('SELECT COUNT(*) AS n FROM products')).n, 1);
        await old.close();
      } finally {
        await second.close();
      }
    } finally {
      fs.rmSync(migrations, { recursive: true, force: true });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('backup y restauración', () => {
    it('hace backups con la app abierta y conserva solo los últimos', async () => {
      const server = await startTestServer();
      try {
        const api = server.client();
        await loginAsAdmin(api);
        const created = (await product(api, 'R1', 100, 60, 10)).data;
        await sale(api, [{ productId: created.id, quantity: 3 }]);
        const env = { DB_FILE: server.dbFile, BACKUP_DIR: server.backupDir, BACKUP_KEEP: '2' };

        // Backups con el servidor funcionando (y escribiendo).
        for (let i = 0; i < 3; i += 1) {
          const result = runScript('src/scripts/backup.js', [], env);
          assert.equal(result.status, 0, result.stderr);
          assert.match(result.stdout, /Backup listo/);
          await new Promise((resolve) => setTimeout(resolve, 1100)); // nombres distintos (segundos)
        }
        const kept = fs.readdirSync(server.backupDir);
        assert.equal(kept.length, 2, 'se conservan solo los últimos 2');
        const listing = runScript('src/scripts/restore.js', [], env);
        assert.match(listing.stdout, /Backups disponibles/);

      } finally {
        await server.close();
      }
    });

    it('restaurar reemplaza la base, guarda antes una copia y rechaza archivos inválidos', async () => {
      const server = await startTestServer();
      const dir = server.dir;
      let backupFile;
      try {
        const api = server.client();
        await loginAsAdmin(api);
        const item = (await product(api, 'R1', 100, 60, 10)).data;
        await sale(api, [{ productId: item.id, quantity: 3 }]);
        const env = { DB_FILE: server.dbFile, BACKUP_DIR: server.backupDir };

        assert.equal(runScript('src/scripts/backup.js', [], env).status, 0);
        backupFile = fs.readdirSync(server.backupDir)[0];
        await api.post('/api/products', { code: 'R2', name: 'Producto extra', costPrice: 1, salePrice: 2, initialStock: 5 });
        assert.equal((await server.db.get('SELECT COUNT(*) AS n FROM products')).n, 2);
        await server.close({ keep: true }); // la aplicación se cierra antes de restaurar

        // Confirmación equivocada: no cambia nada.
        const cancelled = runScript('src/scripts/restore.js', [backupFile], env, 'no\n');
        assert.match(cancelled.stdout, /Cancelado/);

        // Archivos que no son un backup de esta aplicación.
        fs.writeFileSync(path.join(server.backupDir, 'texto.sqlite'), 'esto no es una base');
        const invalid = runScript('src/scripts/restore.js', ['texto.sqlite', '--yes'], env);
        assert.notEqual(invalid.status, 0);
        assert.match(invalid.stderr, /no es un backup válido/);
        assert.match(runScript('src/scripts/restore.js', ['noexiste.sqlite', '--yes'], env).stderr, /No se encontró/);

        // Restauración real.
        const restored = runScript('src/scripts/restore.js', [backupFile, '--yes'], env);
        assert.equal(restored.status, 0, restored.stderr);
        assert.match(restored.stdout, /Restauración completa/);
        assert.ok(fs.readdirSync(server.backupDir).some((f) => f.includes('antes-de-restaurar')), 'se guardó una copia del estado previo');

        const again = await startTestServer({}, { dir });
        try {
          const { db } = again;
          assert.equal((await db.get('SELECT COUNT(*) AS n FROM products')).n, 1, 'el producto extra desapareció');
          assert.equal((await db.get('SELECT COUNT(*) AS n FROM sales')).n, 1, 'la venta sigue');
          assert.equal((await db.get("SELECT stock FROM products WHERE code = 'R1'")).stock, 7);
          const login = await again.client().post('/api/auth/login', { username: 'admin', password: 'clave-segura-1' });
          assert.equal(login.status, 200, 'la sesión y el usuario también se restauraron');
        } finally {
          await again.close();
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });
});
