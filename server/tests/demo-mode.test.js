const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { startTestServer } = require('./helpers/testServer');

// Modo de prueba (APP_MODE=demo): la base arranca con datos de ejemplo y un usuario conocido.
describe('modo de prueba', () => {
  let server;
  let api;

  before(async () => {
    server = await startTestServer({ APP_MODE: 'demo' });
    api = server.client();
  });

  after(() => server.close());

  it('la versión avisa que es una demo, y sin modo de prueba no lo dice', async () => {
    assert.equal((await api.get('/api/version')).data.demo, true);
    const normal = await startTestServer();
    try {
      assert.equal((await normal.client().get('/api/version')).data.demo, false);
    } finally {
      await normal.close();
    }
  });

  it('se puede entrar con el usuario de la demo y ya no pide crear el primero', async () => {
    assert.equal((await api.get('/api/auth/setup-status')).data.needsSetup, false);
    assert.equal((await api.post('/api/auth/login', { username: 'demo', password: 'demo1234' })).status, 200);
  });

  it('trae productos, clientes, ventas de varios días y stock bajo', async () => {
    assert.ok((await api.get('/api/products?limit=100')).data.total >= 15);
    assert.ok((await api.get('/api/customers')).data.total >= 5);

    const sales = (await api.get('/api/sales?limit=100')).data;
    assert.ok(sales.total >= 30, `pocas ventas: ${sales.total}`);
    const days = new Set(sales.items.map((sale) => sale.createdAt.slice(0, 10)));
    assert.ok(days.size >= 8, `ventas en pocos días: ${days.size}`);
    assert.ok(sales.items.some((sale) => sale.status === 'voided'), 'hay una venta anulada');
    assert.ok(sales.items.every((sale) => new Date(sale.createdAt) <= new Date()), 'ninguna venta en el futuro');

    const low = (await api.get('/api/reports/low-stock')).data;
    assert.ok((low.items ?? low).length >= 2, 'hay productos con stock bajo');
  });

  it('los datos de ejemplo son de San Juan: comercio, clientes con 264 y productos con marca', async () => {
    await api.post('/api/auth/login', { username: 'demo', password: 'demo1234' });
    const business = (await api.get('/api/settings/business')).data;
    assert.match(business.address, /San Juan/);
    assert.match(business.phone, /^264 /);

    const customers = (await api.get('/api/customers?limit=100')).data.items;
    const andres = customers.find((c) => c.name === 'Andrés Márquez');
    assert.equal(andres?.phone, '264 458-1305', 'el cliente de la demostración');
    assert.ok(customers.every((c) => !c.phone || c.phone.startsWith('264 ')), 'todos con característica de San Juan');

    const names = (await api.get('/api/products?limit=100')).data.items.map((p) => p.name);
    for (const brand of ['Taragüí', 'Playadito', 'Coca-Cola', 'Villavicencio', 'Guaymallén', 'La Serenísima']) {
      assert.ok(names.some((name) => name.includes(brand)), `falta un producto ${brand}`);
    }

    // Andrés Márquez es el cliente más frecuente de las ventas de ejemplo
    const sales = (await api.get('/api/sales?limit=100')).data.items.filter((s) => s.customer);
    const counts = sales.reduce((acc, s) => ({ ...acc, [s.customer.name]: (acc[s.customer.name] ?? 0) + 1 }), {});
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(top, 'Andrés Márquez');
  });

  it('los datos cumplen las reglas de siempre: el stock cierra con los movimientos', async () => {
    const rows = await server.db.all(
      `SELECT p.code, p.stock, COALESCE(SUM(m.quantity), 0) AS moved
         FROM products p LEFT JOIN stock_movements m ON m.product_id = p.id
        GROUP BY p.id HAVING p.stock != moved`
    );
    assert.deepEqual(rows, []);
    const wrongTotals = await server.db.all(
      `SELECT s.id FROM sales s
         JOIN (SELECT sale_id, SUM(line_total) AS lines FROM sale_items GROUP BY sale_id) i ON i.sale_id = s.id
        WHERE s.total != i.lines - s.discount_amount`
    );
    assert.deepEqual(wrongTotals, []);
  });

  it('reabrir la app no duplica los datos', async () => {
    const login = { username: 'demo', password: 'demo1234' };
    const first = await startTestServer({ APP_MODE: 'demo' });
    const firstClient = first.client();
    await firstClient.post('/api/auth/login', login);
    const total = (await firstClient.get('/api/sales?limit=1')).data.total;
    await first.close({ keep: true });

    const again = await startTestServer({ APP_MODE: 'demo' }, { dir: first.dir });
    try {
      const client = again.client();
      await client.post('/api/auth/login', login);
      assert.equal((await client.get('/api/sales?limit=1')).data.total, total);
    } finally {
      await again.close();
      require('node:fs').rmSync(first.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  });
});
