const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Ventas: importes en centavos, transacción todo-o-nada, concurrencia y anulación.
describe('ventas', () => {
  let server;
  let api;
  let admin;
  let customer;

  const stockOf = async (id) => (await api.get(`/api/products/${id}`)).data.stock;
  const saleCount = async () => (await api.get('/api/sales?limit=1')).data.total;
  const mk = async (code, price, cost, stock) => (await product(api, code, price, cost, stock)).data;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    admin = await loginAsAdmin(api);
    customer = (await api.post('/api/customers', { name: 'Cliente de Ventas' })).data;
  });

  after(() => server.close());

  describe('registrar una venta', () => {
    let P1;
    let P2;
    let first;

    before(async () => {
      P1 = await mk('V1', 100.1, 60.05, 10);
      P2 = await mk('V2', 50, 20, 20);
    });

    it('calcula en centavos exactos, guarda copia de precio y costo y descuenta el stock', async () => {
      const response = await sale(api, [{ productId: P1.id, quantity: 3 }, { productId: P2.id, quantity: 2 }], { customerId: customer.id, notes: 'nota' });
      assert.equal(response.status, 201);
      first = response.data;

      assert.equal(first.subtotal, 400.3, '3 × 100,10 + 2 × 50');
      assert.equal(first.total, 400.3);
      assert.equal(first.discountAmount, 0);
      assert.equal(first.items.length, 2);
      const line = first.items.find((i) => i.productId === P1.id);
      assert.equal(line.unitPrice, 100.1);
      assert.equal(line.unitCost, 60.05);
      assert.equal(line.lineTotal, 300.3);
      assert.equal(first.customer.id, customer.id);
      assert.equal(first.user.id, admin.id);

      assert.equal(await stockOf(P1.id), 7);
      assert.equal(await stockOf(P2.id), 18);
      const movements = (await api.get(`/api/stock/movements?productId=${P1.id}&type=sale`)).data.items;
      assert.equal(movements[0].quantity, -3);
      assert.equal(movements[0].reason, `Venta #${first.id}`);

      const row = await server.db.get('SELECT subtotal, total FROM sales WHERE id = ?', [first.id]);
      assert.deepEqual(row, { subtotal: 40030, total: 40030 }, 'en la base son enteros en centavos');
    });

    it('suma las cantidades de un producto repetido y no toma el precio que manda el cliente', async () => {
      const merged = await sale(api, [{ productId: P1.id, quantity: 1 }, { productId: P1.id, quantity: 1 }]);
      assert.equal(merged.data.items.length, 1);
      assert.equal(merged.data.items[0].quantity, 2);
      assert.equal(merged.data.total, 200.2);

      const tampered = await sale(api, [{ productId: P2.id, quantity: 1, unitPrice: 1 }], { total: 1 });
      assert.equal(tampered.data.total, 50, 'el precio y el total salen de la base');
    });

    it('aplica descuentos por porcentaje o monto, con el redondeo correcto', async () => {
      const percent = await sale(api, [{ productId: P1.id, quantity: 3 }, { productId: P2.id, quantity: 2 }], { discount: { type: 'percent', value: 15 } });
      assert.equal(percent.data.discountAmount, 60.05, '15% de 400,30 = 60,045 → 60,05');
      assert.equal(percent.data.total, 340.25);
      assert.equal(percent.data.discountType, 'percent');

      const amount = await sale(api, [{ productId: P2.id, quantity: 1 }], { discount: { type: 'amount', value: 20 } });
      assert.equal(amount.data.total, 30);

      const zero = await sale(api, [{ productId: P2.id, quantity: 1 }], { discount: { type: 'amount', value: 0 } });
      assert.equal(zero.data.discountType, null);
      assert.equal(zero.data.total, 50);

      const full = await sale(api, [{ productId: P2.id, quantity: 1 }], { discount: { type: 'percent', value: 100 } });
      assert.equal(full.status, 201);
      assert.equal(full.data.total, 0);

      for (const discount of [{ type: 'amount', value: 51 }, { type: 'percent', value: 101 }, { type: 'amount', value: -5 }, { type: 'otro', value: 5 }]) {
        assert.equal((await sale(api, [{ productId: P2.id, quantity: 1 }], { discount })).status, 400, JSON.stringify(discount));
      }
    });

    it('si falta stock en un ítem no se guarda la venta ni se descuenta nada (todo o nada)', async () => {
      const before = { p1: await stockOf(P1.id), p2: await stockOf(P2.id), sales: await saleCount() };
      const response = await sale(api, [{ productId: P1.id, quantity: 1 }, { productId: P2.id, quantity: 999 }]);
      assert.equal(response.status, 409);
      assert.match(response.data.message, /Stock insuficiente/);
      assert.equal(await stockOf(P1.id), before.p1);
      assert.equal(await stockOf(P2.id), before.p2);
      assert.equal(await saleCount(), before.sales);
      const items = await server.db.get('SELECT COUNT(*) AS n FROM sale_items');
      const sales = await server.db.get('SELECT COUNT(*) AS n FROM sales');
      assert.ok(items.n >= sales.n, 'no quedaron ítems huérfanos');
    });

    it('rechaza ventas inválidas', async () => {
      const empty = await product(api, 'V3', 10, 5, 0);
      const cases = [
        [sale(api, []), 400, 'sin ítems'],
        [sale(api, [{ productId: P1.id, quantity: 0 }]), 400, 'cantidad 0'],
        [sale(api, [{ productId: P1.id, quantity: 1.5 }]), 400, 'cantidad decimal'],
        [api.post('/api/sales', { items: [{ productId: P1.id, quantity: 1 }], paymentMethod: 'bitcoin' }), 400, 'medio de pago inválido'],
        [sale(api, [{ productId: 99999, quantity: 1 }]), 400, 'producto inexistente'],
        [sale(api, [{ productId: empty.data.id, quantity: 1 }]), 409, 'producto sin stock'],
        [sale(api, [{ productId: P2.id, quantity: 1 }], { customerId: 99999 }), 400, 'cliente inexistente'],
      ];
      for (const [pending, expected, label] of cases) assert.equal((await pending).status, expected, label);

      await api.patch(`/api/customers/${customer.id}/status`, { active: false });
      assert.equal((await sale(api, [{ productId: P2.id, quantity: 1 }], { customerId: customer.id })).status, 400, 'cliente de baja');
      await api.patch(`/api/customers/${customer.id}/status`, { active: true });
      assert.equal((await server.client().post('/api/sales', { items: [] })).status, 401, 'sin sesión');
    });

    it('el historial no cambia si después cambia el precio del producto', async () => {
      await api.put(`/api/products/${P1.id}`, { code: 'V1', name: 'Producto V1', costPrice: 70, salePrice: 999, minStock: 0, categoryId: null });
      const old = (await api.get(`/api/sales/${first.id}`)).data;
      assert.equal(old.items.find((i) => i.productId === P1.id).unitPrice, 100.1);
      assert.equal(old.total, 400.3);
    });
  });

  describe('concurrencia', () => {
    it('6 ventas simultáneas de 1 unidad con stock 3: se aceptan 3 y el stock nunca es negativo', async () => {
      const item = await mk('C1', 10, 5, 3);
      const results = await Promise.all(
        Array.from({ length: 6 }, () => {
          const client = server.client();
          client.cookie = api.cookie;
          return sale(client, [{ productId: item.id, quantity: 1 }]);
        })
      );
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 201, 201, 409, 409, 409]);
      assert.equal(await stockOf(item.id), 0);
    });

    it('16 ventas cruzadas (productos en orden opuesto) terminan bien, sin trabarse', async () => {
      const a = await mk('C2', 10, 5, 100);
      const b = await mk('C3', 10, 5, 100);
      const results = await Promise.all(
        Array.from({ length: 16 }, (_, i) => {
          const client = server.client();
          client.cookie = api.cookie;
          const items = [{ productId: a.id, quantity: 1 }, { productId: b.id, quantity: 1 }];
          return sale(client, i % 2 ? items : items.reverse());
        })
      );
      assert.ok(results.every((r) => r.status === 201), results.map((r) => r.status).join());
      assert.equal(await stockOf(a.id), 84);
      assert.equal(await stockOf(b.id), 84);
    });

    it('ventas y anulaciones al mismo tiempo mantienen el stock exacto', async () => {
      const item = await mk('C4', 10, 5, 20);
      const created = await Promise.all(Array.from({ length: 5 }, () => sale(api, [{ productId: item.id, quantity: 2 }])));
      assert.ok(created.every((r) => r.status === 201));
      assert.equal(await stockOf(item.id), 10);
      const mixed = await Promise.all([
        ...created.slice(0, 3).map((r) => api.post(`/api/sales/${r.data.id}/void`, {})),
        ...Array.from({ length: 3 }, () => sale(api, [{ productId: item.id, quantity: 1 }])),
      ]);
      assert.ok(mixed.every((r) => r.status === 200 || r.status === 201));
      assert.equal(await stockOf(item.id), 10 + 3 * 2 - 3, 'stock = 10 + 6 devueltos - 3 vendidos');
    });
  });

  describe('anular', () => {
    it('devuelve el stock, guarda quién y por qué, y no se puede anular dos veces', async () => {
      const item = await mk('A1', 10, 5, 10);
      const made = (await sale(api, [{ productId: item.id, quantity: 4 }])).data;
      assert.equal(await stockOf(item.id), 6);

      const voided = await api.post(`/api/sales/${made.id}/void`, { reason: 'Se equivocó' });
      assert.equal(voided.status, 200);
      assert.equal(voided.data.status, 'voided');
      assert.equal(voided.data.voidReason, 'Se equivocó');
      assert.equal(voided.data.voidedByUser.id, admin.id);
      assert.ok(voided.data.voidedAt);
      assert.equal(await stockOf(item.id), 10);

      const back = (await api.get(`/api/stock/movements?productId=${item.id}&type=sale_void`)).data.items[0];
      assert.equal(back.quantity, 4);
      assert.equal((await api.post(`/api/sales/${made.id}/void`, {})).status, 409);
      assert.equal((await api.post('/api/sales/99999/void', {})).status, 404);
    });

    it('funciona aunque el producto ya esté de baja, y un producto de baja no se puede vender', async () => {
      const item = await mk('A2', 10, 5, 5);
      const made = (await sale(api, [{ productId: item.id, quantity: 1 }])).data;
      await api.patch(`/api/products/${item.id}/status`, { active: false });
      const voided = await api.post(`/api/sales/${made.id}/void`, {});
      assert.equal(voided.status, 200);
      assert.equal(await stockOf(item.id), 5);
      assert.equal((await sale(api, [{ productId: item.id, quantity: 1 }])).status, 409);
    });
  });

  describe('listado y restricciones', () => {
    it('filtra por estado, cliente, medio de pago y fechas', async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      assert.ok((await api.get('/api/sales?status=voided')).data.items.every((s) => s.status === 'voided'));
      assert.ok((await api.get(`/api/sales?customerId=${customer.id}`)).data.items.every((s) => s.customer?.id === customer.id));
      assert.equal((await api.get('/api/sales?paymentMethod=cash&limit=5')).status, 200);
      assert.ok((await api.get(`/api/sales?from=${today}&to=${today}&limit=1`)).data.total > 0);
      assert.equal((await api.get('/api/sales?from=2020-01-01&to=2020-01-02')).data.total, 0);
      assert.equal((await api.get('/api/sales?status=xx')).status, 400);
      assert.equal((await api.get('/api/sales/99999')).status, 404);
    });

    it('la base rechaza ventas incoherentes aunque el código falle', async () => {
      const insertSale = (paymentMethod, subtotal, discount, total) =>
        server.db.run(
          `INSERT INTO sales (user_id, payment_method, subtotal, discount_amount, total, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))`,
          [admin.id, paymentMethod, subtotal, discount, total]
        );
      await assert.rejects(insertSale('cash', 10000, 0, 9000), /CHECK constraint/, 'total distinto de subtotal - descuento');
      await assert.rejects(insertSale('oro', 10000, 0, 10000), /CHECK constraint/, 'medio de pago inválido');
      await assert.rejects(insertSale('cash', 10000, 20000, -10000), /CHECK constraint/, 'descuento mayor al subtotal');

      const existing = await server.db.get('SELECT id FROM sales LIMIT 1');
      const anyProduct = await server.db.get('SELECT id FROM products LIMIT 1');
      await assert.rejects(
        server.db.run(
          `INSERT INTO sale_items (sale_id, product_id, product_code, product_name, quantity, unit_price, unit_cost, line_total, created_at, updated_at)
           VALUES (?, ?, 'x', 'x', 2, 1000, 500, 9999, datetime('now'), datetime('now'))`,
          [existing.id, anyProduct.id]
        ),
        /CHECK constraint/,
        'línea con total incorrecto'
      );
      const withSales = await server.db.get('SELECT product_id AS id FROM sale_items LIMIT 1');
      await assert.rejects(server.db.run('DELETE FROM products WHERE id = ?', [withSales.id]), /FOREIGN KEY constraint/, 'no se puede borrar un producto con ventas');
    });
  });
});
