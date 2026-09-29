const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, startTestServer } = require('./helpers/testServer');

// Login, primer uso, cambio de contraseña, versión y la interfaz servida por el backend.
describe('autenticación y primer uso', () => {
  let server;
  let interfaceDir;

  before(async () => {
    // Una "interfaz compilada" mínima para probar que el backend la sirve.
    interfaceDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'mg-ui-'));
    fs.mkdirSync(path.join(interfaceDir, 'assets'));
    fs.writeFileSync(path.join(interfaceDir, 'index.html'), '<!doctype html><div id="root"></div>');
    fs.writeFileSync(path.join(interfaceDir, 'assets', 'app-abc123.js'), 'console.log("ok")');
    server = await startTestServer({ CLIENT_DIST: interfaceDir });
  });

  after(async () => {
    await server.close();
    fs.rmSync(interfaceDir, { recursive: true, force: true });
  });

  it('sirve la interfaz compilada y las rutas de pantalla', async () => {
    const client = server.client();
    let response = await client.get('/');
    assert.equal(response.status, 200);
    assert.match(response.data, /id="root"/);
    assert.match(response.headers.get('cache-control'), /no-cache/);

    for (const route of ['/products', '/sales/new', '/products/categories', '/login']) {
      response = await client.get(route);
      assert.equal(response.status, 200, route);
      assert.match(response.data, /id="root"/, route);
    }

    response = await client.get('/assets/app-abc123.js');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control'), /immutable/);
  });

  it('una ruta /api inexistente responde JSON 404 y la API sigue pidiendo sesión', async () => {
    const client = server.client();
    const missing = await client.get('/api/no-existe');
    assert.equal(missing.status, 404);
    assert.equal(missing.data.message, 'Ruta no encontrada');
    assert.equal((await client.get('/api/products')).status, 401);
    assert.equal((await client.get('/api/health')).data.ok, true);
  });

  it('informa la versión de la aplicación', async () => {
    const response = await server.client().get('/api/version');
    assert.equal(response.status, 200);
    assert.match(response.data.version, /^\d+\.\d+\.\d+$/);
  });

  it('pide el primer uso y valida los datos del administrador', async () => {
    const client = server.client();
    assert.equal((await client.get('/api/auth/setup-status')).data.needsSetup, true);

    const good = { username: 'duena', name: 'Dueña', password: 'clave-segura-1' };
    const invalid = [
      { ...good, password: '1234567' },
      { ...good, password: 'x'.repeat(73) },
      { ...good, username: 'con espacios' },
      { ...good, username: 'ab' },
      { ...good, username: 'ñandú!' },
      { ...good, name: '  ' },
      { username: 'duena', name: 'X' },
    ];
    for (const body of invalid) {
      const response = await client.post('/api/auth/setup', body);
      assert.equal(response.status, 400, JSON.stringify(body));
    }
    assert.equal((await server.db.get('SELECT COUNT(*) AS n FROM users')).n, 0, 'los intentos inválidos no crean usuarios');
  });

  it('con 6 pedidos de primer uso simultáneos, solo uno gana', async () => {
    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        server.client().post('/api/auth/setup', { username: `admin${i}`, name: `Admin ${i}`, password: 'clave-segura-1' })
      )
    );
    const statuses = responses.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409, 409]);
    assert.equal((await server.db.get('SELECT COUNT(*) AS n FROM users')).n, 1);

    const winner = responses.find((r) => r.status === 201);
    assert.match(winner.setCookie, /token=/);
    assert.match(winner.setCookie, /HttpOnly/i);
    assert.match(winner.setCookie, /SameSite=Lax/i);
    assert.doesNotMatch(winner.setCookie, /;\s*Secure/i, 'en desarrollo la cookie no es Secure');
    assert.equal('passwordHash' in winner.data, false, 'la respuesta no expone el hash');

    const again = await server.client().post('/api/auth/setup', { username: 'otra', name: 'Otra', password: 'clave-segura-1' });
    assert.equal(again.status, 409);
    assert.match(again.data.message, /ya fue configurada/);
    assert.equal((await server.client().get('/api/auth/setup-status')).data.needsSetup, false);
  });

  describe('con el usuario creado', () => {
    let username;

    before(async () => {
      username = (await server.db.get('SELECT username FROM users')).username;
    });

    it('login correcto e incorrecto (mismo mensaje para usuario y contraseña)', async () => {
      const client = server.client();
      const wrongPass = await client.post('/api/auth/login', { username, password: 'mala' });
      const wrongUser = await client.post('/api/auth/login', { username: 'nadie', password: 'mala' });
      assert.equal(wrongPass.status, 401);
      assert.equal(wrongUser.status, 401);
      assert.equal(wrongPass.data.message, wrongUser.data.message);
      assert.equal((await client.post('/api/auth/login', {})).status, 400);

      const ok = await client.post('/api/auth/login', { username, password: 'clave-segura-1' });
      assert.equal(ok.status, 200);
      assert.equal((await client.get('/api/auth/me')).data.username, username);
      assert.equal((await client.get('/api/products')).status, 200);
    });

    it('un token inválido y el cierre de sesión dejan sin acceso', async () => {
      const client = server.client();
      client.cookie = 'token=abc.def.ghi';
      assert.equal((await client.get('/api/products')).status, 401);

      const session = server.client();
      await session.post('/api/auth/login', { username, password: 'clave-segura-1' });
      assert.equal((await session.post('/api/auth/logout')).status, 204);
      session.cookie = '';
      assert.equal((await session.get('/api/auth/me')).status, 401);
    });

    it('cambia la contraseña: valida, exige la actual y no cierra la sesión por error', async () => {
      const client = server.client();
      await client.post('/api/auth/login', { username, password: 'clave-segura-1' });

      const wrong = await client.post('/api/auth/change-password', { currentPassword: 'incorrecta', newPassword: 'otra-clave-123' });
      assert.equal(wrong.status, 400, 'contraseña actual incorrecta es 400 (un 401 cerraría la sesión en la pantalla)');
      assert.match(wrong.data.message, /no es correcta/);
      assert.equal((await client.post('/api/auth/change-password', { currentPassword: 'clave-segura-1', newPassword: 'corta' })).status, 400);
      const same = await client.post('/api/auth/change-password', { currentPassword: 'clave-segura-1', newPassword: 'clave-segura-1' });
      assert.equal(same.status, 400);
      assert.match(same.data.message, /distinta/);
      assert.equal((await client.post('/api/auth/change-password', { newPassword: 'otra-clave-123' })).status, 400);
      assert.equal((await server.client().post('/api/auth/change-password', { currentPassword: 'x', newPassword: 'otra-clave-123' })).status, 401);

      const changed = await client.post('/api/auth/change-password', { currentPassword: 'clave-segura-1', newPassword: 'otra-clave-123' });
      assert.equal(changed.status, 204);
      assert.equal((await server.client().post('/api/auth/login', { username, password: 'clave-segura-1' })).status, 401);
      assert.equal((await server.client().post('/api/auth/login', { username, password: 'otra-clave-123' })).status, 200);

      const row = await server.db.get('SELECT password_hash FROM users WHERE username = ?', [username]);
      assert.match(row.password_hash, /^\$2[aby]\$/, 'se guarda un hash bcrypt');
      assert.equal(row.password_hash.includes('otra-clave'), false);
    });
  });
});

describe('cookie de sesión según el entorno', () => {
  it('es Secure solo en producción (o si se fuerza)', () => {
    const token = require('../src/utils/token');
    const secure = (env) => {
      const saved = { ...process.env };
      delete process.env.COOKIE_SECURE;
      delete process.env.NODE_ENV;
      Object.assign(process.env, env);
      const value = token.cookieOptions().secure;
      process.env = saved;
      return value;
    };
    assert.equal(secure({}), false);
    assert.equal(secure({ NODE_ENV: 'production' }), true);
    assert.equal(secure({ NODE_ENV: 'production', COOKIE_SECURE: 'false' }), false);
    assert.equal(secure({ COOKIE_SECURE: 'true' }), true);
  });
});

module.exports = { loginAsAdmin };
