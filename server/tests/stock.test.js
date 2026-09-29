const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, startTestServer } = require('./helpers/testServer');

// Movimientos de stock: el único camino para cambiar el stock de un producto.
describe('movimientos de stock', () => {
  let server;
  let api;
  let admin;

  const movement = (productId, type, extra = {}) => api.post('/api/stock/movements', { productId, type, ...extra });
  const stockOf = async (id) => (await api.get(`/api/products/${id}`)).data.stock;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    admin = await loginAsAdmin(api);
  });

  after(() => server.close());

  it('el stock inicial de un producto entra como un movimiento (y no se puede escribir directo)', async () => {
    const created = await product(api, 'S1', 10, 5, 10);
    assert.equal(created.status, 201);
    assert.equal(created.data.stock, 10);

    const history = (await api.get(`/api/stock/movements?productId=${created.data.id}`)).data.items;
    assert.equal(history.length, 1);
    assert.equal(history[0].type, 'in');
    assert.equal(history[0].reason, 'Stock inicial');
    assert.equal(history[0].user.id, admin.id);
    assert.equal(history[0].stockBefore, 0);
    assert.equal(history[0].stockAfter, 10);

    assert.equal((await api.post('/api/products', { code: 'S2', name: 'x', costPrice: 1, salePrice: 2, stock: 5 })).status, 400);
    assert.equal((await product(api, 'S3', 1, 1, 0)).data.stock, 0, 'sin stock inicial no hay movimiento');
  });

  it('entrada, salida y ajuste dejan saldos consistentes', async () => {
    const id = (await product(api, 'S10', 10, 5, 10)).data.id;

    assert.equal((await movement(id, 'in', { quantity: 5 })).data.stockAfter, 15);
    const out = await movement(id, 'out', { quantity: 3, reason: 'Se venció' });
    assert.equal(out.status, 201);
    assert.equal(out.data.quantity, -3, 'la cantidad se guarda con signo');
    const adjust = await movement(id, 'adjustment', { newStock: 8, reason: 'Conteo mensual' });
    assert.equal(adjust.data.quantity, -4);
    assert.equal(adjust.data.stockBefore, 12);
    assert.equal(await stockOf(id), 8);

    const chain = (await api.get(`/api/stock/movements?productId=${id}&limit=100`)).data.items.reverse();
    assert.equal(chain.length, 4);
    chain.forEach((m, i) => {
      assert.equal(m.stockAfter, m.stockBefore + m.quantity);
      if (i > 0) assert.equal(m.stockBefore, chain[i - 1].stockAfter, 'cada movimiento arranca donde terminó el anterior');
    });
  });

  it('valida los datos y rechaza lo imposible', async () => {
    const id = (await product(api, 'S20', 10, 5, 12)).data.id;
    const cases = [
      [movement(id, 'out', { quantity: 1 }), 400, 'salida sin motivo'],
      [movement(id, 'adjustment', { newStock: 5 }), 400, 'ajuste sin motivo'],
      [movement(id, 'in', { quantity: 0 }), 400, 'cantidad 0'],
      [movement(id, 'in', { quantity: 1.5 }), 400, 'cantidad decimal'],
      [movement(id, 'in', { quantity: -2 }), 400, 'cantidad negativa'],
      [movement(id, 'adjustment', { newStock: -1, reason: 'x' }), 400, 'stock real negativo'],
      [movement(id, 'sale', { quantity: 1, reason: 'x' }), 400, 'tipo que solo usa Ventas'],
      [movement(99999, 'in', { quantity: 1 }), 404, 'producto inexistente'],
      [movement(id, 'out', { quantity: 100, reason: 'x' }), 409, 'más de lo que hay'],
      [movement(id, 'adjustment', { newStock: 12, reason: 'igual' }), 400, 'ajuste al mismo valor'],
    ];
    for (const [pending, expected, label] of cases) assert.equal((await pending).status, expected, label);
    assert.equal(await stockOf(id), 12, 'ningún intento inválido cambió el stock');

    const insufficient = await movement(id, 'out', { quantity: 100, reason: 'x' });
    assert.match(insufficient.data.message, /Stock insuficiente/);
  });

  it('no permite movimientos manuales en un producto de baja', async () => {
    const id = (await product(api, 'S30', 10, 5, 5)).data.id;
    await api.patch(`/api/products/${id}/status`, { active: false });
    const response = await movement(id, 'in', { quantity: 1 });
    assert.equal(response.status, 409);
    assert.match(response.data.message, /dado de baja/);
  });

  it('5 salidas simultáneas de 3 sobre un stock de 8: entran 2 y el stock nunca es negativo', async () => {
    const id = (await product(api, 'S40', 10, 5, 8)).data.id;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => server.client()).map(async (client) => {
        client.cookie = api.cookie;
        return client.post('/api/stock/movements', { productId: id, type: 'out', quantity: 3, reason: 'concurrente' });
      })
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 409, 409, 409]);
    assert.equal(await stockOf(id), 2);
    const count = await server.db.get('SELECT COUNT(*) AS n FROM stock_movements WHERE product_id = ? AND reason = ?', [id, 'concurrente']);
    assert.equal(count.n, 2, 'quedó un movimiento por cada salida aceptada');
  });

  it('lista con filtros por producto, tipo y fechas, y valida los parámetros', async () => {
    const id = (await product(api, 'S50', 10, 5, 4)).data.id;
    await movement(id, 'in', { quantity: 2 });
    await movement(id, 'out', { quantity: 1, reason: 'x' });

    assert.equal((await api.get(`/api/stock/movements?productId=${id}`)).data.total, 3);
    assert.equal((await api.get(`/api/stock/movements?productId=${id}&type=out`)).data.total, 1);
    assert.equal((await api.get(`/api/stock/movements?productId=${id}&limit=2`)).data.items.length, 2);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    assert.equal((await api.get(`/api/stock/movements?productId=${id}&from=${today}&to=${today}`)).data.total, 3, 'el rango de hoy incluye los movimientos de hoy');
    assert.equal((await api.get(`/api/stock/movements?productId=${id}&from=2020-01-01&to=2020-01-02`)).data.total, 0);

    assert.equal((await api.get('/api/stock/movements?from=ayer')).status, 400);
    assert.equal((await api.get('/api/stock/movements?type=xx')).status, 400);
  });

  it('la base rechaza movimientos incoherentes', async () => {
    const id = (await product(api, 'S60', 10, 5, 3)).data.id;
    const insert = (type, quantity, before, after) =>
      server.db.run(
        `INSERT INTO stock_movements (product_id, user_id, type, quantity, stock_before, stock_after, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [id, admin.id, type, quantity, before, after]
      );
    await assert.rejects(insert('in', 0, 3, 3), /CHECK constraint/, 'cantidad cero');
    await assert.rejects(insert('in', 2, 3, 99), /CHECK constraint/, 'saldo que no cierra');
    await assert.rejects(insert('regalo', 1, 3, 4), /CHECK constraint/, 'tipo inválido');
    await assert.rejects(insert('out', -5, 3, -2), /CHECK constraint/, 'saldo negativo');
    await assert.rejects(server.db.run('DELETE FROM products WHERE id = ?', [id]), /FOREIGN KEY constraint/, 'no se puede borrar un producto con historial');
  });
});
