const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, startTestServer } = require('./helpers/testServer');

// Movimiento múltiple: un tipo y un motivo para varios productos, todo o nada.
describe('movimiento de stock múltiple', () => {
  let server;
  let api;

  const bulk = (body) => api.post('/api/stock/movements/bulk', body);
  const stockOf = async (id) => (await api.get(`/api/products/${id}`)).data.stock;
  const historyOf = async (id) => (await api.get(`/api/stock/movements?productId=${id}`)).data.items;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
  });

  after(() => server.close());

  it('una entrada para varios productos deja un movimiento por producto', async () => {
    const a = (await product(api, 'B1', 10, 5, 1)).data.id;
    const b = (await product(api, 'B2', 10, 5, 2)).data.id;
    const res = await bulk({ type: 'in', reason: 'Pedido del lunes', items: [{ productId: a, quantity: 10 }, { productId: b, quantity: 5 }] });
    assert.equal(res.status, 201);
    assert.equal(res.data.count, 2);
    assert.equal(await stockOf(a), 11);
    assert.equal(await stockOf(b), 7);
    const last = (await historyOf(a))[0];
    assert.equal(last.reason, 'Pedido del lunes');
    assert.equal(last.stockAfter, 11);
  });

  it('todo o nada: si un renglón falla no se aplica ninguno', async () => {
    const a = (await product(api, 'B10', 10, 5, 10)).data.id;
    const b = (await product(api, 'B11', 10, 5, 2)).data.id;
    const res = await bulk({ type: 'out', reason: 'Vencido', items: [{ productId: a, quantity: 4 }, { productId: b, quantity: 3 }] });
    assert.equal(res.status, 409);
    assert.match(JSON.stringify(res.data), /Stock insuficiente/);
    assert.equal(await stockOf(a), 10);
    assert.equal((await historyOf(a)).length, 1, 'solo el stock inicial');
  });

  it('ajuste: saltea los que ya coinciden y falla si no cambia ninguno', async () => {
    const a = (await product(api, 'B20', 10, 5, 5)).data.id;
    const b = (await product(api, 'B21', 10, 5, 8)).data.id;
    const res = await bulk({ type: 'adjustment', reason: 'Conteo', items: [{ productId: a, newStock: 5 }, { productId: b, newStock: 6 }] });
    assert.equal(res.status, 201);
    assert.equal(res.data.count, 1);
    assert.equal(res.data.skipped, 1);
    assert.equal(await stockOf(b), 6);
    const same = await bulk({ type: 'adjustment', reason: 'Conteo', items: [{ productId: a, newStock: 5 }] });
    assert.equal(same.status, 400);
  });

  it('valida el pedido', async () => {
    const a = (await product(api, 'B30', 10, 5, 5)).data.id;
    assert.equal((await bulk({ type: 'in', items: [] })).status, 400, 'sin renglones');
    assert.equal((await bulk({ type: 'in' })).status, 400, 'sin lista');
    assert.equal((await bulk({ type: 'sale', items: [{ productId: a, quantity: 1 }] })).status, 400, 'tipo inválido');
    assert.equal((await bulk({ type: 'out', items: [{ productId: a, quantity: 1 }] })).status, 400, 'salida sin motivo');
    assert.equal((await bulk({ type: 'in', items: [{ productId: a, quantity: 1 }, { productId: a, quantity: 2 }] })).status, 400, 'repetido');
    assert.equal((await bulk({ type: 'in', items: [{ productId: a, quantity: 0 }] })).status, 400, 'cantidad 0');
    assert.equal((await bulk({ type: 'in', items: [{ productId: a, quantity: 1.5 }] })).status, 400, 'no entera');
    assert.equal((await bulk({ type: 'in', items: [{ productId: 99999, quantity: 1 }] })).status, 404, 'producto inexistente');
    const many = Array.from({ length: 201 }, (_, i) => ({ productId: i + 1, quantity: 1 }));
    assert.equal((await bulk({ type: 'in', items: many })).status, 400, 'demasiados');
    assert.equal(await stockOf(a), 5);
  });

  it('no se puede sin sesión', async () => {
    const anon = server.client();
    assert.equal((await anon.post('/api/stock/movements/bulk', { type: 'in', items: [] })).status, 401);
  });
});
