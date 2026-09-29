const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, openDatabase, startTestServer } = require('./helpers/testServer');

// Copia externa: opcional; si no está configurada o falla, la aplicación sigue igual y solo se advierte.
describe('copia de seguridad externa', () => {
  let server;
  let api;
  let external;

  const backupFilesIn = (dir) => fs.readdirSync(dir).filter((name) => name.endsWith('.sqlite')).sort();

  before(async () => {
    server = await startTestServer({ BACKUP_KEEP: '3' });
    api = server.client();
    await loginAsAdmin(api);
    external = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-externa-'));
  });

  after(() => {
    fs.rmSync(external, { recursive: true, force: true });
    return server.close();
  });

  it('sin carpeta externa hay una advertencia, pero todo funciona', async () => {
    assert.equal((await server.client().get('/api/backups/external')).status, 401, 'exige sesión');
    const status = (await api.get('/api/backups/external')).data;
    assert.equal(status.state, 'none');
    assert.equal(status.warning, true);
    assert.equal((await api.post('/api/backups')).status, 201, 'hacer copias no depende de la externa');
    assert.equal((await api.get('/api/backups')).data.external.state, 'none');
  });

  it('valida la carpeta elegida', async () => {
    for (const folder of ['relativa/carpeta', path.join(external, 'no-existe'), server.backupDir, 123]) {
      assert.equal((await api.put('/api/backups/external', { folder })).status, 400, String(folder));
    }
    const file = path.join(external, 'archivo.txt');
    fs.writeFileSync(file, 'x');
    assert.equal((await api.put('/api/backups/external', { folder: file })).status, 400, 'un archivo no es una carpeta');
    assert.equal((await api.get('/api/backups/external')).data.state, 'none', 'nada quedó configurado');
  });

  it('al elegir la carpeta copia enseguida la última copia y queda en orden', async () => {
    const response = await api.put('/api/backups/external', { folder: external });
    assert.equal(response.status, 200);
    assert.equal(response.data.state, 'ok');
    assert.equal(response.data.warning, false);
    assert.equal(response.data.folder, external);
    assert.equal(backupFilesIn(external).length, 1);
    assert.equal(fs.readdirSync(external).some((name) => name.endsWith('.copiando')), false, 'no quedan archivos temporales');
  });

  it('cada copia nueva va también a la carpeta externa, que conserva solo las últimas', async () => {
    for (let i = 0; i < 4; i += 1) {
      assert.equal((await api.post('/api/backups')).status, 201);
    }
    const outside = backupFilesIn(external);
    assert.equal(outside.length, 3, 'BACKUP_KEEP = 3');
    assert.deepEqual(outside, backupFilesIn(server.backupDir).slice(-3), 'son las mismas más nuevas que las locales');
  });

  it('una copia externa es una base válida y completa', async () => {
    const newest = backupFilesIn(external).pop();
    const db = openDatabase(path.join(external, newest));
    assert.equal((await db.get('SELECT COUNT(*) AS n FROM users')).n, 1);
    await db.close();
  });

  it('si la carpeta deja de estar disponible: la copia local sigue y se muestra una advertencia', async () => {
    const gone = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-pendrive-'));
    assert.equal((await api.put('/api/backups/external', { folder: gone })).status, 200);
    fs.rmSync(gone, { recursive: true, force: true }); // "se desconecta el pendrive"

    const before = backupFilesIn(server.backupDir).length;
    assert.equal((await api.post('/api/backups')).status, 201, 'la copia local no falla');
    assert.ok(backupFilesIn(server.backupDir).length >= Math.min(before + 1, 3));

    const status = (await api.get('/api/backups/external')).data;
    assert.equal(status.state, 'error');
    assert.equal(status.warning, true);
    assert.match(status.lastError, /no está disponible/);

    // Al volver a estar disponible, la próxima copia lo arregla sola.
    fs.mkdirSync(gone);
    assert.equal((await api.post('/api/backups')).status, 201);
    assert.equal((await api.get('/api/backups/external')).data.state, 'ok');
    fs.rmSync(gone, { recursive: true, force: true });
  });

  it('dos copias seguidas (doble clic) no fallan aunque caigan en el mismo segundo', async () => {
    const before = backupFilesIn(server.backupDir).length;
    const [first, second] = await Promise.all([api.post('/api/backups'), api.post('/api/backups')]);
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.notEqual(first.data.name, second.data.name);
    assert.ok(backupFilesIn(server.backupDir).length >= Math.min(before + 2, 3));
  });

  it('se puede quitar la carpeta externa', async () => {
    const response = await api.put('/api/backups/external', { folder: null });
    assert.equal(response.status, 200);
    assert.equal(response.data.state, 'none');
    assert.equal(response.data.folder, null);
  });
});
