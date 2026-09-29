const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Reportes: resumen del período, más vendidos y stock bajo (las ventas anuladas no cuentan).
describe('reportes', () => {
  let server;
  let api;
  let P1;
  let P2;
  let P3;

  const today = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);

    P1 = (await product(api, 'RP1', 100, 60, 100)).data;
    P2 = (await product(api, 'RP2', 50, 20, 100)).data;
    P3 = (await product(api, 'RP3', 10, 4, 100)).data;

    // A: 3×P1 + 2×P2 = 400 (costo 220) · B: 1×P1 con 10% = 90 (costo 60) · C: 20×P3 = 200 (costo 80) · D: anulada
    await sale(api, [{ productId: P1.id, quantity: 3 }, { productId: P2.id, quantity: 2 }]);
    await sale(api, [{ productId: P1.id, quantity: 1 }], { discount: { type: 'percent', value: 10 } });
    await sale(api, [{ productId: P3.id, quantity: 20 }]);
    const voided = (await sale(api, [{ productId: P2.id, quantity: 5 }])).data;
    await api.post(`/api/sales/${voided.id}/void`, { reason: 'test' });
  });

  after(() => server.close());

  it('el resumen suma solo las ventas completadas y calcula la ganancia', async () => {
    const response = await api.get('/api/reports/summary');
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, {
      salesCount: 3,
      voidedCount: 1,
      revenue: 690, // 400 + 90 + 200
      discounts: 10,
      cost: 360, // 220 + 60 + 80
      profit: 330,
      averageTicket: 230,
    });
  });

  it('los más vendidos: por unidades y por facturación, sin contar la venta anulada', async () => {
    const byQuantity = (await api.get('/api/reports/top-products?sort=quantity')).data;
    assert.deepEqual(byQuantity.map((p) => [p.code, p.quantity, p.revenue]), [
      ['RP3', 20, 200],
      ['RP1', 4, 400],
      ['RP2', 2, 100], // la venta anulada de 5 unidades no cuenta
    ]);
    assert.equal(byQuantity[0].name, 'Producto RP3');
    assert.equal(byQuantity[0].productId, P3.id);

    const byRevenue = (await api.get('/api/reports/top-products?sort=revenue')).data;
    assert.deepEqual(byRevenue.map((p) => p.code), ['RP1', 'RP3', 'RP2']);
    assert.equal((await api.get('/api/reports/top-products?limit=2')).data.length, 2);
  });

  it('respeta el período y valida las fechas', async () => {
    const day = today();
    assert.equal((await api.get(`/api/reports/summary?from=${day}&to=${day}`)).data.salesCount, 3, 'hoy incluye las ventas de hoy');

    const past = (await api.get('/api/reports/summary?from=2020-01-01&to=2020-01-02')).data;
    assert.deepEqual(past, { salesCount: 0, voidedCount: 0, revenue: 0, discounts: 0, cost: 0, profit: 0, averageTicket: 0 });
    assert.deepEqual((await api.get('/api/reports/top-products?from=2020-01-01&to=2020-01-02')).data, []);

    assert.equal((await api.get('/api/reports/summary?from=2026-12-31&to=2026-01-01')).status, 400, 'desde posterior a hasta');
    assert.equal((await api.get('/api/reports/summary?from=ayer')).status, 400);
    assert.equal((await api.get('/api/reports/top-products?sort=precio')).status, 400);
  });

  it('stock bajo: solo productos activos en o bajo el mínimo, primero los más urgentes', async () => {
    const low1 = (await product(api, 'RL1', 10, 5, 3, { minStock: 5 })).data; // falta 2
    const low2 = (await product(api, 'RL2', 10, 5, 0, { minStock: 10 })).data; // sin stock, falta 10
    await product(api, 'RL3', 10, 5, 10, { minStock: 2 }); // stock de sobra
    const baja = (await product(api, 'RL4', 10, 5, 1, { minStock: 4 })).data; // bajo, pero de baja
    await api.patch(`/api/products/${baja.id}/status`, { active: false });

    const response = await api.get('/api/reports/low-stock?limit=100');
    const codes = response.data.items.map((p) => p.code);
    assert.deepEqual(codes, ['RL2', 'RL1'], 'RL2 (falta 10) antes que RL1 (falta 2); no aparecen RL3 ni el de baja');
    assert.ok(response.data.items.every((p) => p.stock <= p.minStock));
    assert.ok('category' in response.data.items[0]);
    assert.equal(low1.minStock - low1.stock, 2);
    assert.equal(low2.minStock - low2.stock, 10);

    const page1 = (await api.get('/api/reports/low-stock?limit=1&page=1')).data;
    const page2 = (await api.get('/api/reports/low-stock?limit=1&page=2')).data;
    assert.equal(page1.total, 2);
    assert.equal(page1.pages, 2);
    assert.notEqual(page1.items[0].id, page2.items[0].id);
  });

  it('todos los reportes exigen sesión', async () => {
    const anonymous = server.client();
    for (const route of ['summary', 'top-products', 'low-stock']) {
      assert.equal((await anonymous.get(`/api/reports/${route}`)).status, 401, route);
    }
  });
});
