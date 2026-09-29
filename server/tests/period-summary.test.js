const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Resumen de ventas de un período: total por medio de pago, descuentos y anuladas aparte.
describe('resumen de ventas por período', () => {
  let server;
  let api;

  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const shiftDay = (days) => {
    const now = new Date();
    return isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
  };
  const today = shiftDay(0);
  const get = (query) => api.get(`/api/reports/period-summary${query}`);

  const EXPECTED = {
    salesCount: 3,
    total: 880, // 300 + 180 + 400 (la anulada no suma)
    discounts: 20,
    methods: [
      { method: 'cash', salesCount: 2, total: 480 },
      { method: 'transfer', salesCount: 1, total: 400 },
      { method: 'card', salesCount: 0, total: 0 }, // el medio sin ventas igual aparece
    ],
    voided: { count: 1, total: 1000 },
  };

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

  it('un día (desde = hasta): total, medios de pago (siempre los tres), descuentos y anuladas aparte', async () => {
    const response = await get(`?from=${today}&to=${today}`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.data, { from: today, to: today, ...EXPECTED });
  });

  it('un rango de varios días que incluye hoy (semana, mes, personalizado) suma lo mismo', async () => {
    const week = await get(`?from=${shiftDay(-6)}&to=${today}`);
    assert.deepEqual(week.data, { from: shiftDay(-6), to: today, ...EXPECTED });
    const wide = await get(`?from=${shiftDay(-40)}&to=${shiftDay(5)}`);
    assert.equal(wide.data.salesCount, 3);
    assert.equal(wide.data.total, 880);
  });

  it('sin fechas devuelve todo el historial; con una sola, desde o hasta ahí', async () => {
    const all = await get('');
    assert.equal(all.data.salesCount, 3);
    assert.equal(all.data.from, null);
    assert.equal(all.data.to, null);
    assert.equal((await get(`?from=${today}`)).data.salesCount, 3);
    assert.equal((await get(`?to=${today}`)).data.salesCount, 3);
    assert.equal((await get(`?from=${shiftDay(1)}`)).data.salesCount, 0);
    assert.equal((await get(`?to=${shiftDay(-1)}`)).data.salesCount, 0);
  });

  it('un período sin ventas devuelve todo en cero', async () => {
    const response = await get('?from=2000-01-01&to=2000-01-31');
    assert.equal(response.status, 200);
    assert.equal(response.data.salesCount, 0);
    assert.equal(response.data.total, 0);
    assert.deepEqual(response.data.methods.map((m) => m.total), [0, 0, 0]);
    assert.deepEqual(response.data.voided, { count: 0, total: 0 });
  });

  it('el día anterior y el siguiente no incluyen las ventas de hoy', async () => {
    for (const offset of [-1, 1]) {
      const day = shiftDay(offset);
      assert.equal((await get(`?from=${day}&to=${day}`)).data.salesCount, 0, `día ${offset}`);
    }
  });

  it('valida las fechas y exige sesión', async () => {
    for (const query of ['?from=hoy', '?from=2026-13-45&to=2026-14-01', '?to=15/01/2026', `?from=${today}&to=${shiftDay(-3)}`]) {
      assert.equal((await get(query)).status, 400, query);
    }
    assert.equal((await server.client().get('/api/reports/period-summary')).status, 401);
  });
});
