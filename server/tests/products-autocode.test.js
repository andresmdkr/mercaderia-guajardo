const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, startTestServer } = require('./helpers/testServer');

// Código de producto automático: si se crea sin código, se asigna P00001, P00002...
describe('código automático de productos', () => {
  let server;
  let api;
  const create = (extra = {}) => api.post('/api/products', { name: 'Producto', costPrice: 1, salePrice: 2, ...extra });

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
  });

  after(() => server.close());

  it('sin código (vacío, en blanco o ausente) asigna el siguiente, empezando en P00001', async () => {
    assert.equal((await create({ code: '' })).data.code, 'P00001');
    assert.equal((await create({ code: '   ' })).data.code, 'P00002');
    assert.equal((await create()).data.code, 'P00003');
  });

  it('sigue al código más alto con ese formato y no cuenta los códigos de barras ni otros formatos', async () => {
    assert.equal((await create({ code: 'p00010' })).status, 201); // escrito a mano, en minúscula
    await create({ code: '7791234567890' }); // código de barras
    await create({ code: 'PX9' }); // otro formato
    assert.equal((await create()).data.code, 'P00011');
  });

  it('un código escrito a mano sigue funcionando y no se pisa', async () => {
    const manual = await create({ code: 'ABC1' });
    assert.equal(manual.data.code, 'ABC1');
    assert.equal((await create({ code: 'ABC1' })).status, 409);
  });

  it('altas simultáneas sin código reciben números distintos', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => create()));
    assert.ok(results.every((r) => r.status === 201), results.map((r) => r.status).join(','));
    const codes = results.map((r) => r.data.code);
    assert.equal(new Set(codes).size, 12);
  });

  it('al editar el código sigue siendo obligatorio', async () => {
    const product = (await create()).data;
    const response = await api.put(`/api/products/${product.id}`, { code: '', name: 'x', costPrice: 1, salePrice: 2 });
    assert.equal(response.status, 400);
  });
});
