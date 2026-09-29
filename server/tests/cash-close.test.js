const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Cierre de caja de un día: total por medio de pago, descuentos y anuladas aparte.
describe('cierre de caja', () => {
  let server;
  let api;

  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = isoDay(new Date());

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);

    const p = (await product(api, 'CC1', 100, 60, 100)).data;
    const one = (quantity) => [{ productId: p.id, quantity }];
    await sale(api, one(3), { paymentMethod: 'cash' }); // 300
    await sale(api, one(2), { paymentMethod: 'cash', discount: { type: 'percent', value: 10 } }); // 200 - 20 = 180
    await sale(api, one(4), { paymentMethod: 'transfer' }); // 400
    const voided = (await sale(api, one(10), { paymentMethod: 'card' })).data; // 1000, anulada
    await api.post(`/api/sales/${voided.id}/void`, { reason: 'test' });
  });

  after(() => server.close());

  it('resume el día: total, medios de pago (siempre los tres), descuentos y anuladas aparte', async () => {
    const response = await api.get(`/api/reports/cash-close?date=${today}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, {
      date: today,
      salesCount: 3,
      total: 880, // 300 + 180 + 400 (la anulada no suma)
      discounts: 20,
      methods: [
        { method: 'cash', salesCount: 2, total: 480 },
        { method: 'transfer', salesCount: 1, total: 400 },
        { method: 'card', salesCount: 0, total: 0 }, // el medio sin ventas igual aparece
      ],
      voided: { count: 1, total: 1000 },
    });
  });

  it('sin fecha usa hoy', async () => {
    const response = await api.get('/api/reports/cash-close');
    assert.equal(response.data.date, today);
    assert.equal(response.data.salesCount, 3);
  });

  it('un día sin ventas devuelve todo en cero', async () => {
    const response = await api.get('/api/reports/cash-close?date=2000-01-15');
    assert.equal(response.status, 200);
    assert.equal(response.data.salesCount, 0);
    assert.equal(response.data.total, 0);
    assert.deepEqual(response.data.methods.map((m) => m.total), [0, 0, 0]);
    assert.deepEqual(response.data.voided, { count: 0, total: 0 });
  });

  it('el día anterior y el siguiente no incluyen las ventas de hoy', async () => {
    const day = new Date();
    for (const offset of [-1, 1]) {
      const other = new Date(day.getFullYear(), day.getMonth(), day.getDate() + offset);
      assert.equal((await api.get(`/api/reports/cash-close?date=${isoDay(other)}`)).data.salesCount, 0, `día ${offset}`);
    }
  });

  it('valida la fecha y exige sesión', async () => {
    for (const date of ['hoy', '2026-13-45', '15/01/2026']) {
      assert.equal((await api.get(`/api/reports/cash-close?date=${encodeURIComponent(date)}`)).status, 400, date);
    }
    assert.equal((await server.client().get('/api/reports/cash-close')).status, 401);
  });
});
