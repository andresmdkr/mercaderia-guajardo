const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Orden de los listados por columna (?sort=&order=): productos, clientes y ventas.
describe('orden de los listados', () => {
  let server;
  let api;

  const names = (response) => response.data.items.map((item) => item.name);

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
    const cat = (await api.post('/api/categories', { name: 'Zeta' })).data;
    const cat2 = (await api.post('/api/categories', { name: 'alfa' })).data;
    // nombre, precio de venta, costo, stock, categoría
    const ids = {};
    ids.b = (await product(api, 'C2', 200, 50, 5, { name: 'banana', categoryId: cat.id, minStock: 7 })).data.id;
    ids.a = (await product(api, 'C3', 100, 80, 20, { name: 'Ají', categoryId: cat2.id, minStock: 1 })).data.id;
    ids.c = (await product(api, 'C1', 300, 10, 1, { name: 'cereal' })).data.id;
    await api.post('/api/customers', { name: 'Zoe', phone: '11 5555-0001', email: 'b@x.com' });
    await api.post('/api/customers', { name: 'ana', phone: '11 5555-0003', email: 'a@x.com' });
    await api.post('/api/customers', { name: 'Marta' });
    await sale(api, [{ productId: ids.a, quantity: 1 }]); // 100
    await sale(api, [{ productId: ids.b, quantity: 3 }]); // 600
    await sale(api, [{ productId: ids.c, quantity: 1 }]); // 300
  });

  after(() => server.close());

  it('sin pedir orden, los productos van por nombre sin distinguir mayúsculas', async () => {
    assert.deepEqual(names(await api.get('/api/products')), ['Ají', 'banana', 'cereal']);
  });

  it('productos: por nombre y código sin distinguir mayúsculas, en los dos sentidos', async () => {
    assert.deepEqual(names(await api.get('/api/products?sort=name&order=desc')), ['cereal', 'banana', 'Ají']);
    assert.deepEqual((await api.get('/api/products?sort=code&order=asc')).data.items.map((p) => p.code), ['C1', 'C2', 'C3']);
  });

  it('productos: por precios, stock, mínimo y categoría', async () => {
    assert.deepEqual(names(await api.get('/api/products?sort=salePrice&order=desc')), ['cereal', 'banana', 'Ají']);
    assert.deepEqual(names(await api.get('/api/products?sort=costPrice&order=asc')), ['cereal', 'banana', 'Ají']);
    assert.deepEqual(names(await api.get('/api/products?sort=stock&order=asc')), ['cereal', 'banana', 'Ají']);
    assert.deepEqual(names(await api.get('/api/products?sort=minStock&order=desc')), ['banana', 'Ají', 'cereal']);
    // categoría: alfa (Ají), Zeta (banana); sin categoría va primero al ordenar ascendente
    assert.deepEqual(names(await api.get('/api/products?sort=category&order=asc')), ['cereal', 'Ají', 'banana']);
  });

  it('el orden se combina con los filtros y la paginación', async () => {
    const page1 = await api.get('/api/products?sort=name&order=asc&limit=2&page=1');
    const page2 = await api.get('/api/products?sort=name&order=asc&limit=2&page=2');
    assert.deepEqual(names(page1), ['Ají', 'banana']);
    assert.deepEqual(names(page2), ['cereal']);
    assert.equal(page1.data.total, 3);
  });

  it('rechaza un campo o un sentido que no existe (no se acepta cualquier columna)', async () => {
    for (const query of ['?sort=password', '?sort=id;DROP TABLE products', '?sort=name&order=sideways']) {
      assert.equal((await api.get(`/api/products${query}`)).status, 400, query);
    }
    assert.equal((await api.get('/api/customers?sort=passwordHash')).status, 400);
    assert.equal((await api.get('/api/sales?sort=userId')).status, 400);
  });

  it('clientes: por nombre, teléfono y email (los vacíos van primero al subir)', async () => {
    assert.deepEqual(names(await api.get('/api/customers')), ['ana', 'Marta', 'Zoe']);
    assert.deepEqual(names(await api.get('/api/customers?sort=name&order=desc')), ['Zoe', 'Marta', 'ana']);
    assert.deepEqual(names(await api.get('/api/customers?sort=phone&order=asc')), ['Marta', 'Zoe', 'ana']);
    assert.deepEqual(names(await api.get('/api/customers?sort=email&order=desc')), ['Zoe', 'ana', 'Marta']);
  });

  it('ventas: por defecto las más nuevas primero; también por total y por número', async () => {
    const totals = async (query) => (await api.get(`/api/sales${query}`)).data.items.map((s) => s.total);
    assert.deepEqual(await totals(''), [300, 600, 100]);
    assert.deepEqual(await totals('?sort=total&order=asc'), [100, 300, 600]);
    assert.deepEqual(await totals('?sort=total&order=desc'), [600, 300, 100]);
    const ids = (await api.get('/api/sales?sort=id&order=asc')).data.items.map((s) => s.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a - b));
  });
});
