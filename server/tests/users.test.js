const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { createLimiter } = require('../src/utils/loginLimiter');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Varias personas usando el programa (cada una con su usuario): alta, baja, contraseñas y límite de intentos de ingreso.
describe('usuarios', () => {
  let server;
  let admin;
  let api;

  const passwordOf = { ana: 'clave-de-ana-1', beto: 'clave-de-beto-1' };
  const login = (username, password) => server.client().post('/api/auth/login', { username, password });

  before(async () => {
    server = await startTestServer();
    api = server.client();
    admin = await loginAsAdmin(api);
  });

  after(() => server.close());

  it('exige sesión', async () => {
    const anonymous = server.client();
    assert.equal((await anonymous.get('/api/users')).status, 401);
    assert.equal((await anonymous.post('/api/users', { username: 'x', name: 'x', password: 'clave-segura-1' })).status, 401);
  });

  it('lista los usuarios y no expone contraseñas', async () => {
    const list = await api.get('/api/users');
    assert.equal(list.status, 200);
    assert.equal(list.data.length, 1);
    assert.equal(list.data[0].username, 'admin');
    assert.equal(list.data[0].active, true);
    assert.equal('passwordHash' in list.data[0], false);
  });

  it('crea usuarios, valida los datos y no deja repetir el nombre (ni cambiando mayúsculas)', async () => {
    const ana = await api.post('/api/users', { username: 'ana', name: 'Ana Pérez', password: passwordOf.ana });
    assert.equal(ana.status, 201);
    assert.equal(ana.data.active, true);
    assert.equal('passwordHash' in ana.data, false);

    assert.equal((await api.post('/api/users', { username: 'ANA', name: 'Otra Ana', password: passwordOf.ana })).status, 409, 'mayúsculas no cuentan');
    assert.equal((await api.post('/api/users', { username: 'beto', name: 'Beto', password: 'corta' })).status, 400);
    assert.equal((await api.post('/api/users', { username: 'b', name: 'Beto', password: passwordOf.beto })).status, 400);
    assert.equal((await api.post('/api/users', { username: 'beto', name: '', password: passwordOf.beto })).status, 400);
    assert.equal((await api.post('/api/users', { username: 'beto', name: 'Beto Gómez', password: passwordOf.beto })).status, 201);
    assert.equal((await api.get('/api/users')).data.length, 3);
  });

  it('cada persona entra con su usuario y lo que hace queda a su nombre', async () => {
    const ana = server.client();
    assert.equal((await ana.post('/api/auth/login', { username: 'ana', password: passwordOf.ana })).status, 200);
    await product(api, 'U1', 100, 60, 10);
    const done = await sale(ana, [{ productId: (await api.get('/api/products/by-code/U1')).data.id, quantity: 2 }]);
    assert.equal(done.status, 201);
    const detail = (await ana.get(`/api/sales/${done.data.id}`)).data;
    assert.equal(detail.user.name, 'Ana Pérez', 'la venta guarda quién la hizo');
  });

  it('dos personas vendiendo el mismo producto a la vez: el stock nunca queda negativo', async () => {
    const beto = server.client();
    await beto.post('/api/auth/login', { username: 'beto', password: passwordOf.beto });
    const ana = server.client();
    await ana.post('/api/auth/login', { username: 'ana', password: passwordOf.ana });
    const created = (await product(api, 'U2', 50, 20, 5)).data; // 5 unidades
    const attempts = [];
    for (let i = 0; i < 6; i += 1) attempts.push((i % 2 === 0 ? ana : beto).post('/api/sales', { items: [{ productId: created.id, quantity: 1 }], paymentMethod: 'cash' }));
    const results = await Promise.all(attempts);
    const ok = results.filter((r) => r.status === 201).length;
    assert.equal(ok, 5, 'se venden las 5 unidades y la sexta se rechaza');
    assert.equal(results.filter((r) => r.status >= 400 && r.status < 500).length, 1);
    assert.equal((await server.db.get('SELECT stock FROM products WHERE id = ?', [created.id])).stock, 0);
  });

  it('una baja corta la sesión al instante y no deja volver a entrar', async () => {
    const session = server.client();
    await session.post('/api/auth/login', { username: 'beto', password: passwordOf.beto });
    assert.equal((await session.get('/api/products')).status, 200);

    const betoId = (await api.get('/api/users')).data.find((u) => u.username === 'beto').id;
    const off = await api.patch(`/api/users/${betoId}/active`, { active: false });
    assert.equal(off.status, 200);
    assert.equal(off.data.active, false);

    assert.equal((await session.get('/api/products')).status, 401, 'la sesión abierta deja de valer');
    const withPassword = await login('beto', passwordOf.beto);
    assert.equal(withPassword.status, 403);
    assert.match(withPassword.data.message, /dado de baja/);
    const wrong = await login('beto', 'mala-contraseña-1');
    assert.equal(wrong.status, 401, 'con contraseña incorrecta no se revela si el usuario está de baja');

    // Sus ventas siguen ahí con su nombre
    assert.equal((await api.patch(`/api/users/${betoId}/active`, { active: true })).status, 200);
    assert.equal((await login('beto', passwordOf.beto)).status, 200, 'al reactivarlo vuelve a entrar');
  });

  it('nadie puede darse de baja a sí mismo y los datos inválidos se rechazan', async () => {
    const own = await api.patch(`/api/users/${admin.id}/active`, { active: false });
    assert.equal(own.status, 400);
    assert.match(own.data.message, /vos mismo/);
    assert.equal((await api.patch(`/api/users/${admin.id}/active`, { active: 'no' })).status, 400);
    assert.equal((await api.patch('/api/users/99999/active', { active: false })).status, 404);
    assert.equal((await api.patch('/api/users/abc/active', { active: false })).status, 400);
  });

  it('se puede restablecer la contraseña de otra persona', async () => {
    const anaId = (await api.get('/api/users')).data.find((u) => u.username === 'ana').id;
    assert.equal((await api.post(`/api/users/${anaId}/password`, { password: 'corta' })).status, 400);
    assert.equal((await api.post('/api/users/99999/password', { password: 'nueva-clave-ana-2' })).status, 404);
    assert.equal((await api.post(`/api/users/${anaId}/password`, { password: 'nueva-clave-ana-2' })).status, 204);
    assert.equal((await login('ana', passwordOf.ana)).status, 401, 'la contraseña vieja ya no sirve');
    assert.equal((await login('ana', 'nueva-clave-ana-2')).status, 200);
  });

  it('después de 5 errores seguidos bloquea el ingreso de esa persona un rato (aunque la contraseña sea la correcta)', async () => {
    for (let i = 0; i < 5; i += 1) assert.equal((await login('ana', 'incorrecta-' + i)).status, 401);
    const locked = await login('ana', 'nueva-clave-ana-2');
    assert.equal(locked.status, 429);
    assert.match(locked.data.message, /Demasiados intentos/);
    assert.equal((await login('beto', passwordOf.beto)).status, 200, 'otra persona no se ve afectada');
  });
});

describe('límite de intentos de ingreso (reloj controlado)', () => {
  it('bloquea al llegar al máximo, avisa cuánto falta y se libera solo', () => {
    let time = 0;
    const limiter = createLimiter({ maxFailures: 3, lockMs: 60_000, windowMs: 600_000, now: () => time });
    limiter.fail('k'); limiter.fail('k');
    assert.equal(limiter.secondsLeft('k'), 0);
    limiter.fail('k');
    assert.equal(limiter.secondsLeft('k'), 60);
    time = 30_000;
    assert.equal(limiter.secondsLeft('k'), 30);
    time = 61_000;
    assert.equal(limiter.secondsLeft('k'), 0, 'pasado el tiempo, puede intentar de nuevo');
  });

  it('un ingreso correcto borra los errores, y los errores viejos no suman', () => {
    let time = 0;
    const limiter = createLimiter({ maxFailures: 3, lockMs: 60_000, windowMs: 600_000, now: () => time });
    limiter.fail('k'); limiter.fail('k'); limiter.succeed('k'); limiter.fail('k'); limiter.fail('k');
    assert.equal(limiter.secondsLeft('k'), 0, 'empezó de cero tras el ingreso correcto');
    time = 700_000; // fuera de la ventana
    limiter.fail('k');
    assert.equal(limiter.secondsLeft('k'), 0, 'los errores de hace mucho no cuentan');
  });

  it('cada clave se cuenta por separado', () => {
    const limiter = createLimiter({ maxFailures: 2 });
    limiter.fail('a'); limiter.fail('a');
    assert.ok(limiter.secondsLeft('a') > 0);
    assert.equal(limiter.secondsLeft('b'), 0);
  });
});
