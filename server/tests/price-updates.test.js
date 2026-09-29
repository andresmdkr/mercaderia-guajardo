const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Actualización masiva de precios: vista previa, aplicar (todo o nada), historial y deshacer.
describe('actualización masiva de precios', () => {
  let server;
  let api;
  let catA;
  let catB;
  const ids = {};

  const body = (extra = {}) => ({ percent: 10, ...extra });
  const price = async (code) => (await server.db.get('SELECT sale_price, cost_price FROM products WHERE code = ?', [code]));

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
    catA = (await api.post('/api/categories', { name: 'A' })).data;
    catB = (await api.post('/api/categories', { name: 'B' })).data;
    // código, precio de venta, costo, stock, categoría
    ids.P1 = (await product(api, 'P1', 100, 60, 10, { categoryId: catA.id })).data.id;
    ids.P2 = (await product(api, 'P2', 250.5, 100, 10, { categoryId: catA.id })).data.id;
    ids.P3 = (await product(api, 'P3', 1000, 600, 10, { categoryId: catB.id })).data.id;
    ids.P4 = (await product(api, 'P4', 3, 1, 10, { categoryId: catB.id })).data.id;
    await api.patch(`/api/products/${ids.P2}/status`, { active: false });
  });

  after(() => server.close());

  it('exige sesión', async () => {
    const anonymous = server.client();
    assert.equal((await anonymous.get('/api/price-updates')).status, 401);
    assert.equal((await anonymous.post('/api/price-updates/preview', body())).status, 401);
  });

  it('la vista previa calcula los precios nuevos sin cambiar nada', async () => {
    const response = await api.post('/api/price-updates/preview', body());
    assert.equal(response.status, 200);
    assert.equal(response.data.count, 4);
    const byCode = Object.fromEntries(response.data.items.map((item) => [item.code, item]));
    assert.equal(byCode.P1.newPrice, 110);
    assert.equal(byCode.P2.newPrice, 275.55); // 250,50 × 1,10
    assert.equal(byCode.P3.newPrice, 1100);
    assert.equal(byCode.P4.newPrice, 3.3);
    assert.equal(byCode.P1.newCost, 60, 'el costo no se toca si no se pide');
    assert.equal((await price('P1')).sale_price, 10000, 'la vista previa no modifica la base');
  });

  it('filtra por categoría y valida la categoría', async () => {
    const response = await api.post('/api/price-updates/preview', body({ categoryId: catA.id }));
    assert.deepEqual(response.data.items.map((i) => i.code).sort(), ['P1', 'P2']);
    assert.equal((await api.post('/api/price-updates/preview', body({ categoryId: 99999 }))).status, 400);
  });

  it('redondea al múltiplo pedido y nunca deja en cero un precio con valor', async () => {
    const response = await api.post('/api/price-updates/preview', body({ roundTo: 10 }));
    const byCode = Object.fromEntries(response.data.items.map((item) => [item.code, item]));
    assert.equal(byCode.P1.newPrice, 110);
    assert.equal(byCode.P2.newPrice, 280); // 275,55 → $280
    assert.equal(byCode.P4.newPrice, 10, '3,30 redondeado a 10 daría 0: el mínimo es una unidad');
  });

  it('puede ajustar también el costo, y bajar precios con porcentaje negativo', async () => {
    const both = await api.post('/api/price-updates/preview', body({ costPercent: 10 }));
    assert.equal(both.data.items.find((i) => i.code === 'P1').newCost, 66);
    const down = await api.post('/api/price-updates/preview', { percent: -20 });
    assert.equal(down.data.items.find((i) => i.code === 'P3').newPrice, 800);
  });

  it('valida los datos', async () => {
    for (const bad of [{}, { percent: 'abc' }, { percent: 0 }, { percent: 600 }, { percent: -100 }, body({ roundTo: 7 }), body({ costPercent: 'x' })]) {
      assert.equal((await api.post('/api/price-updates/preview', bad)).status, 400, JSON.stringify(bad));
    }
  });

  it('aplicar exige confirmar la cantidad vista y rechaza si no coincide', async () => {
    assert.equal((await api.post('/api/price-updates', body())).status, 400, 'sin expectedCount');
    const mismatch = await api.post('/api/price-updates', body({ expectedCount: 3 }));
    assert.equal(mismatch.status, 409);
    assert.equal((await price('P1')).sale_price, 10000, 'no cambió nada');
  });

  it('aplica todo junto, conserva el stock y no toca las ventas ya hechas', async () => {
    const before = (await sale(api, [{ productId: ids.P1, quantity: 2 }])).data; // se vende a $100
    const applied = await api.post('/api/price-updates', body({ categoryId: catA.id, expectedCount: 2 }));
    assert.equal(applied.status, 201);
    assert.equal(applied.data.count, 2);
    assert.equal((await price('P1')).sale_price, 11000);
    assert.equal((await price('P2')).sale_price, 27555);
    assert.equal((await price('P3')).sale_price, 100000, 'otra categoría: intacta');
    assert.equal((await server.db.get('SELECT stock FROM products WHERE code = ?', ['P1'])).stock, 8, 'el stock no cambia');
    const item = await server.db.get('SELECT unit_price FROM sale_items WHERE sale_id = ?', [before.id]);
    assert.equal(item.unit_price, 10000, 'la venta anterior conserva el precio con el que se vendió');
  });

  it('el historial muestra el lote y solo el último se puede deshacer', async () => {
    const list = (await api.get('/api/price-updates')).data;
    assert.equal(list.length, 1);
    assert.equal(list[0].percent, 10);
    assert.equal(list[0].categoryName, 'A');
    assert.equal(list[0].count, 2);
    assert.equal(list[0].canUndo, true);
    assert.equal(list[0].undone, false);
  });

  it('deshacer devuelve los precios anteriores; no se puede deshacer dos veces', async () => {
    const list = (await api.get('/api/price-updates')).data;
    const undone = await api.post(`/api/price-updates/${list[0].id}/undo`);
    assert.equal(undone.status, 200);
    assert.deepEqual(undone.data, { restored: 2, skipped: 0 });
    assert.equal((await price('P1')).sale_price, 10000);
    assert.equal((await price('P2')).sale_price, 25050);
    assert.equal((await api.post(`/api/price-updates/${list[0].id}/undo`)).status, 409);
    assert.equal((await api.post('/api/price-updates/99999/undo')).status, 404);
    assert.equal((await api.get('/api/price-updates')).data[0].undone, true);
  });

  it('solo se deshace el último lote, y respeta los productos editados después', async () => {
    const first = await api.post('/api/price-updates', body({ categoryId: catB.id, expectedCount: 2 })); // P3 y P4
    await api.post('/api/price-updates', { percent: 5, categoryId: catB.id, expectedCount: 2 });
    assert.equal((await api.post(`/api/price-updates/${first.data.batchId}/undo`)).status, 409, 'hay uno más nuevo');

    const list = (await api.get('/api/price-updates')).data;
    const latest = list.find((item) => item.canUndo);
    // Se edita a mano P3 después del lote más nuevo: al deshacer, ese producto se respeta.
    await api.put(`/api/products/${ids.P3}`, { code: 'P3', name: 'Producto P3', costPrice: 600, salePrice: 1234, minStock: 0, categoryId: catB.id });
    const undone = await api.post(`/api/price-updates/${latest.id}/undo`);
    assert.deepEqual(undone.data, { restored: 1, skipped: 1 });
    assert.equal((await price('P3')).sale_price, 123400, 'el precio editado a mano no se pisa');
  });

  it('con esos valores ningún producto cambia: se avisa', async () => {
    // 0,001 % redondeado a centavos no cambia ningún precio de los que hay
    const response = await api.post('/api/price-updates/preview', { percent: 0.01, categoryId: catB.id });
    assert.equal(response.status, 200);
    if (response.data.count === 0) {
      assert.equal((await api.post('/api/price-updates', { percent: 0.01, categoryId: catB.id, expectedCount: 1 })).status, 400);
    }
  });
});
