const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Reportes de medios de pago y de mejores clientes (las ventas anuladas no cuentan).
describe('reportes de medios de pago y clientes', () => {
  let server;
  let api;
  let ana;
  let beto;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);

    const p = (await product(api, 'RC1', 100, 60, 100)).data;
    ana = (await api.post('/api/customers', { name: 'Ana' })).data;
    beto = (await api.post('/api/customers', { name: 'Beto' })).data;
    const one = (quantity) => [{ productId: p.id, quantity }];

    await sale(api, one(3), { customerId: ana.id, paymentMethod: 'cash' }); // 300
    await sale(api, one(2), { customerId: ana.id, paymentMethod: 'transfer' }); // 200
    await sale(api, one(4), { customerId: beto.id, paymentMethod: 'card' }); // 400
    await sale(api, one(1), { paymentMethod: 'cash' }); // 100, sin cliente
    const voided = (await sale(api, one(10), { customerId: beto.id, paymentMethod: 'card' })).data; // 1000, anulada
    await api.post(`/api/sales/${voided.id}/void`, { reason: 'test' });
  });

  after(() => server.close());

  it('medios de pago: cantidad de ventas y total, del que más cobra al que menos', async () => {
    const response = await api.get('/api/reports/payment-methods');
    assert.equal(response.status, 200);
    const byMethod = Object.fromEntries(response.data.map((row) => [row.method, row]));
    assert.deepEqual(byMethod.card, { method: 'card', salesCount: 1, total: 400 }); // la anulada de $1000 no suma
    assert.deepEqual(byMethod.cash, { method: 'cash', salesCount: 2, total: 400 });
    assert.deepEqual(byMethod.transfer, { method: 'transfer', salesCount: 1, total: 200 });
    assert.deepEqual(response.data.map((row) => row.total), [400, 400, 200]); // de mayor a menor
  });

  it('mejores clientes: por total cobrado, y las ventas sin cliente aparte', async () => {
    const response = await api.get('/api/reports/top-customers');
    assert.equal(response.status, 200);
    assert.deepEqual(
      response.data.items.map((row) => [row.name, row.salesCount, row.total]),
      [
        ['Ana', 2, 500],
        ['Beto', 1, 400],
      ]
    );
    assert.deepEqual(response.data.withoutCustomer, { salesCount: 1, total: 100 });
  });

  it('respeta el límite y el período, y pide sesión', async () => {
    assert.equal((await api.get('/api/reports/top-customers?limit=1')).data.items.length, 1);
    const future = await api.get('/api/reports/top-customers?from=2999-01-01');
    assert.deepEqual(future.data, { items: [], withoutCustomer: { salesCount: 0, total: 0 } });
    assert.deepEqual((await api.get('/api/reports/payment-methods?from=2999-01-01')).data, []);

    const anonymous = server.client();
    for (const route of ['payment-methods', 'top-customers']) {
      assert.equal((await anonymous.get(`/api/reports/${route}`)).status, 401, route);
    }
  });
});
