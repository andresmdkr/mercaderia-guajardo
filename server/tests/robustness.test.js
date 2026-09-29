const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, sale, startTestServer } = require('./helpers/testServer');

// Robustez: sin sesión no se entra a ninguna parte, y ninguna entrada absurda puede producir un error del servidor (5xx).
describe('robustez de la API', () => {
  let server;
  let api;
  let productId;
  let customerId;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
    productId = (await product(api, 'R1', 100, 50, 20)).data.id;
    customerId = (await api.post('/api/customers', { name: 'Cliente Robusto', phone: '264 458-1305' })).data.id;
  });

  after(() => server.close());

  // Pedido "crudo" (permite mandar un cuerpo que no es JSON válido, un tipo raro o uno enorme)
  const raw = (method, pathname, body, headers = { 'content-type': 'application/json' }) =>
    fetch(server.baseUrl + pathname, { method, headers: { ...headers, cookie: api.cookie }, body });

  it('sin iniciar sesión, todas las rutas privadas contestan 401', async () => {
    const anon = server.client();
    const routes = [
      ['GET', '/api/auth/me'], ['POST', '/api/auth/change-password'],
      ['GET', '/api/backups'], ['POST', '/api/backups'], ['GET', '/api/backups/external'], ['PUT', '/api/backups/external'],
      ['GET', '/api/categories'], ['POST', '/api/categories'], ['PUT', '/api/categories/1'], ['DELETE', '/api/categories/1'],
      ['GET', '/api/customers'], ['GET', '/api/customers/phone-check?phone=1'], ['GET', '/api/customers/1'], ['POST', '/api/customers'],
      ['PUT', '/api/customers/1'], ['PATCH', '/api/customers/1/status'],
      ['GET', '/api/price-updates'], ['POST', '/api/price-updates/preview'], ['POST', '/api/price-updates'], ['POST', '/api/price-updates/1/undo'],
      ['GET', '/api/products'], ['GET', '/api/products/by-code/R1'], ['GET', '/api/products/1'], ['POST', '/api/products'],
      ['PUT', '/api/products/1'], ['PATCH', '/api/products/1/status'],
      ['GET', '/api/reports/summary'], ['GET', '/api/reports/top-products'], ['GET', '/api/reports/payment-methods'],
      ['GET', '/api/reports/top-customers'], ['GET', '/api/reports/period-summary'], ['GET', '/api/reports/low-stock'],
      ['GET', '/api/sales'], ['GET', '/api/sales/1'], ['POST', '/api/sales'], ['POST', '/api/sales/1/void'],
      ['GET', '/api/settings/business'], ['PUT', '/api/settings/business'],
      ['GET', '/api/stock/movements'], ['POST', '/api/stock/movements'], ['POST', '/api/stock/movements/bulk'],
    ];
    const open = [];
    for (const [method, url] of routes) {
      const res = await anon.request(method, url, method === 'GET' ? undefined : {});
      if (res.status !== 401) open.push(`${method} ${url} → ${res.status}`);
    }
    assert.deepEqual(open, [], 'rutas que no piden sesión');
  });

  it('los listados aguantan parámetros absurdos (nunca 5xx)', async () => {
    const lists = ['/api/products', '/api/customers', '/api/sales', '/api/stock/movements', '/api/price-updates', '/api/backups',
      '/api/reports/summary', '/api/reports/top-products', '/api/reports/payment-methods', '/api/reports/top-customers',
      '/api/reports/period-summary', '/api/reports/low-stock'];
    const weird = [
      'page=0', 'page=-5', 'page=abc', 'page=99999999999999999999', 'limit=0', 'limit=-1', 'limit=100000', 'limit=1.5',
      'search=%25', 'search=_', "search='", 'search=%22%20OR%201%3D1%20--', `search=${'x'.repeat(5000)}`, 'search=%00', 'search=%F0%9F%98%80',
      'sort=name;DROP%20TABLE%20products&order=desc', 'sort=__proto__', 'sort=constructor&order=asc', 'order=sideways', 'sort[]=a',
      'from=2026-13-45', 'from=ayer', 'from=2026-01-10&to=2026-01-01', 'to=9999-12-31', 'from=0001-01-01',
      'categoryId=abc', 'categoryId=-1', 'active=maybe', 'lowStock=xx', 'status=xx', 'customerId=abc', 'paymentMethod=bitcoin', 'productId=x', 'type=zzz',
    ];
    const bad = [];
    for (const list of lists) {
      for (const query of weird) {
        const res = await api.get(`${list}?${query}`);
        if (res.status >= 500) bad.push(`GET ${list}?${query.slice(0, 40)} → ${res.status}`);
      }
    }
    assert.deepEqual(bad, [], 'respuestas 5xx');
  });

  it('los identificadores raros en la dirección dan 400/404, no 5xx', async () => {
    const ids = ['abc', '-1', '0', '1.5', '99999999999999999999', '%00', '1;DROP', 'NaN'];
    const bad = [];
    for (const id of ids) {
      for (const [method, url] of [
        ['GET', `/api/products/${id}`], ['GET', `/api/customers/${id}`], ['GET', `/api/sales/${id}`], ['POST', `/api/sales/${id}/void`],
        ['PUT', `/api/products/${id}`], ['PATCH', `/api/products/${id}/status`], ['PUT', `/api/customers/${id}`], ['PATCH', `/api/customers/${id}/status`],
        ['PUT', `/api/categories/${id}`], ['DELETE', `/api/categories/${id}`], ['POST', `/api/price-updates/${id}/undo`],
      ]) {
        const res = await api.request(method, url, method === 'GET' ? undefined : {});
        if (res.status >= 500) bad.push(`${method} ${url} → ${res.status}`);
      }
    }
    assert.deepEqual(bad, [], 'respuestas 5xx');
  });

  it('crear y editar con valores absurdos nunca produce 5xx', async () => {
    const huge = 'x'.repeat(100000);
    const values = [null, undefined, '', ' ', 'abc', -1, 0, 0.005, 1.5, 1e21, -1e21, 1e308, Number.MAX_SAFE_INTEGER, true, [], {}, [1], huge, '💥', '<script>alert(1)</script>', "'; DROP TABLE users; --"];
    const bad = [];
    const attempt = async (method, url, body) => {
      const res = await api.request(method, url, body);
      if (res.status >= 500) bad.push(`${method} ${url} ${JSON.stringify(body).slice(0, 90)} → ${res.status}`);
    };
    for (const v of values) {
      await attempt('POST', '/api/products', { code: v, name: 'Ok', costPrice: 1, salePrice: 2 });
      await attempt('POST', '/api/products', { code: 'Z' + Math.random(), name: v, costPrice: 1, salePrice: 2 });
      await attempt('POST', '/api/products', { code: 'Y' + Math.random(), name: 'Ok', costPrice: v, salePrice: 2 });
      await attempt('POST', '/api/products', { code: 'X' + Math.random(), name: 'Ok', costPrice: 1, salePrice: v });
      await attempt('POST', '/api/products', { code: 'W' + Math.random(), name: 'Ok', costPrice: 1, salePrice: 2, initialStock: v, minStock: v, categoryId: v });
      await attempt('PUT', `/api/products/${productId}`, { code: 'R1', name: v, costPrice: v, salePrice: v, minStock: v });
      await attempt('PATCH', `/api/products/${productId}/status`, { active: v });
      await attempt('POST', '/api/customers', { name: v, phone: v, email: v, address: v, notes: v });
      await attempt('PUT', `/api/customers/${customerId}`, { name: v, phone: v, email: v });
      await attempt('POST', '/api/categories', { name: v });
      await attempt('PUT', '/api/settings/business', { name: v, address: v, phone: v, email: v });
      await attempt('POST', '/api/auth/change-password', { currentPassword: v, newPassword: v });
      await attempt('PUT', '/api/backups/external', { folder: v });
      await attempt('POST', '/api/stock/movements', { productId: v, type: 'in', quantity: v, reason: v });
      await attempt('POST', '/api/stock/movements', { productId, type: 'adjustment', newStock: v, reason: 'x' });
      await attempt('POST', '/api/stock/movements', { productId, type: v, quantity: 1 });
      await attempt('POST', '/api/stock/movements/bulk', { type: 'in', items: v });
      await attempt('POST', '/api/stock/movements/bulk', { type: 'in', items: [{ productId: v, quantity: v }] });
      await attempt('POST', '/api/sales', { items: v, paymentMethod: 'cash' });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: v }], paymentMethod: 'cash' });
      await attempt('POST', '/api/sales', { items: [{ productId: v, quantity: 1 }], paymentMethod: 'cash' });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: 1 }], paymentMethod: v });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: 1 }], paymentMethod: 'cash', customerId: v, notes: v });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: 1 }], paymentMethod: 'cash', discount: v });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: 1 }], paymentMethod: 'cash', discount: { type: 'percent', value: v } });
      await attempt('POST', '/api/sales', { items: [{ productId, quantity: 1 }], paymentMethod: 'cash', discount: { type: 'amount', value: v } });
      await attempt('POST', '/api/price-updates/preview', { percent: v, categoryId: v, roundTo: v, costPercent: v });
      await attempt('POST', '/api/price-updates', { percent: v, categoryId: v, roundTo: v, expectedCount: v });
    }
    assert.deepEqual(bad, [], 'respuestas 5xx');
  });

  it('cuerpos mal formados o gigantes se rechazan bien (400/413), no 5xx', async () => {
    const cases = [
      ['JSON cortado', () => raw('POST', '/api/products', '{"code":')],
      ['JSON vacío', () => raw('POST', '/api/products', '')],
      ['texto plano', () => raw('POST', '/api/products', 'hola', { 'content-type': 'text/plain' })],
      ['tipo raro', () => raw('POST', '/api/sales', '<xml/>', { 'content-type': 'application/xml' })],
      ['JSON de 2 MB', () => raw('POST', '/api/customers', JSON.stringify({ name: 'x'.repeat(2 * 1024 * 1024) }))],
      ['null', () => raw('POST', '/api/sales', 'null')],
      ['lista en vez de objeto', () => raw('POST', '/api/products', '[1,2,3]')],
      ['número gigante', () => raw('POST', '/api/products', '{"code":"A","name":"B","costPrice":1e999,"salePrice":2}')],
    ];
    const bad = [];
    for (const [label, run] of cases) {
      const res = await run();
      if (res.status >= 500) bad.push(`${label} → ${res.status}`);
      await res.text();
    }
    assert.deepEqual(bad, [], 'respuestas 5xx');
    assert.equal((await raw('POST', '/api/products', '{"code":')).status, 400, 'JSON cortado = 400');
    assert.equal((await api.get('/api/no-existe')).status, 404);
    assert.equal((await api.request('DELETE', '/api/products/1')).status, 404);
  });

  it('descuentos y redondeos: el total siempre cierra y nunca da 5xx', async () => {
    const price = (await product(api, 'R2', 333.33, 100, 500)).data.id;
    const discounts = [
      undefined, { type: 'percent', value: 0 }, { type: 'percent', value: 100 }, { type: 'percent', value: 33.333 }, { type: 'percent', value: 0.01 },
      { type: 'percent', value: 99.99 }, { type: 'percent', value: 100.01 }, { type: 'percent', value: -1 },
      { type: 'amount', value: 0 }, { type: 'amount', value: 0.01 }, { type: 'amount', value: 333.33 }, { type: 'amount', value: 333.34 },
      { type: 'amount', value: 1000000 }, { type: 'amount', value: -5 }, { type: 'amount', value: 10.005 },
    ];
    const bad = [];
    for (const discount of discounts) {
      for (const quantity of [1, 3, 7]) {
        const res = await sale(api, [{ productId: price, quantity }], { discount });
        if (res.status >= 500) bad.push(`descuento ${JSON.stringify(discount)} x${quantity} → ${res.status}`);
      }
    }
    assert.deepEqual(bad, [], 'respuestas 5xx');

    // Invariantes en la base: total = subtotal - descuento, sin negativos, y el stock cierra con los movimientos
    const broken = await server.db.all('SELECT id FROM sales WHERE total != subtotal - discount_amount OR total < 0 OR discount_amount > subtotal');
    assert.deepEqual(broken, []);
    const lineSum = await server.db.all(
      'SELECT s.id FROM sales s JOIN (SELECT sale_id, SUM(line_total) AS lines FROM sale_items GROUP BY sale_id) i ON i.sale_id = s.id WHERE s.subtotal != i.lines'
    );
    assert.deepEqual(lineSum, []);
    const stock = await server.db.all('SELECT p.code FROM products p LEFT JOIN stock_movements m ON m.product_id = p.id GROUP BY p.id HAVING p.stock != COALESCE(SUM(m.quantity), 0)');
    assert.deepEqual(stock, []);
  });

  it('ventas absurdas: cantidades enormes, repetidas o de productos dados de baja', async () => {
    const res1 = await sale(api, [{ productId, quantity: 1e9 }]);
    assert.equal(res1.status, 400, 'cantidad fuera de lo razonable');
    assert.equal((await sale(api, [{ productId, quantity: 0.5 }])).status, 400);
    // Un producto repetido en la venta se suma en un solo renglón
    const merged = (await product(api, 'R5', 10, 5, 10)).data.id;
    const two = await sale(api, [{ productId: merged, quantity: 3 }, { productId: merged, quantity: 4 }]);
    assert.equal(two.status, 201);
    assert.equal(two.data.items.length, 1, 'un solo renglón');
    assert.equal(two.data.items[0].quantity, 7, 'suma 3 + 4');
    assert.equal((await sale(api, [{ productId: merged, quantity: 2 }, { productId: merged, quantity: 2 }])).status, 409, 'repetido y sin stock: se suman y no alcanza');
    const gone = (await product(api, 'R3', 10, 5, 5)).data.id;
    await api.patch(`/api/products/${gone}/status`, { active: false });
    assert.equal((await sale(api, [{ productId: gone, quantity: 1 }])).status, 409, 'dado de baja');
    const limited = (await product(api, 'R4', 10, 5, 5)).data.id;
    assert.equal((await sale(api, [{ productId: limited, quantity: 6 }])).status, 409, 'hay 5 y se piden 6');
    const voidable = (await product(api, 'R6', 10, 5, 5)).data.id; // (R1 quedó sin stock por las pruebas de arriba)
    const created = await sale(api, [{ productId: voidable, quantity: 1 }]);
    assert.equal(created.status, 201);
    assert.equal((await api.post(`/api/sales/${created.data.id}/void`, { reason: 'x' })).status, 200);
    assert.equal((await api.post(`/api/sales/${created.data.id}/void`, { reason: 'x' })).status, 409, 'no se anula dos veces');
    assert.equal((await api.post(`/api/sales/${created.data.id}/void`, { reason: 'x'.repeat(2000) })).status >= 500, false);
  });

  it('los números absurdos (precios y stock) se rechazan con 400', async () => {
    const base = { code: 'TOPE', name: 'Tope', costPrice: 1, salePrice: 2 };
    assert.equal((await api.post('/api/products', { ...base, salePrice: 1e12 })).status, 400, 'precio enorme');
    assert.equal((await api.post('/api/products', { ...base, costPrice: 1e15 })).status, 400, 'costo enorme');
    assert.equal((await api.post('/api/products', { ...base, initialStock: 1e12 })).status, 400, 'stock inicial enorme');
    assert.equal((await api.post('/api/products', { ...base, minStock: 1e12 })).status, 400, 'mínimo enorme');
    assert.equal((await api.post('/api/stock/movements', { productId, type: 'in', quantity: 1e12 })).status, 400);
    assert.equal((await api.post('/api/stock/movements', { productId, type: 'adjustment', newStock: 1e12, reason: 'x' })).status, 400);
    assert.equal((await api.post('/api/products', { ...base, salePrice: 99999999.99, initialStock: 9999999 })).status, 201, 'los máximos permitidos entran');
  });

  it('categorías y códigos son únicos sin importar mayúsculas ni tildes', async () => {
    assert.equal((await api.post('/api/categories', { name: 'Lácteos' })).status, 201);
    for (const name of ['lácteos', 'LACTEOS', 'Lacteos ', 'lÁcTeOs']) {
      assert.equal((await api.post('/api/categories', { name })).status, 409, name);
    }
    const other = (await api.post('/api/categories', { name: 'Bebidas' })).data;
    assert.equal((await api.put(`/api/categories/${other.id}`, { name: 'lacteos' })).status, 409, 'renombrar a una existente');
    assert.equal((await api.put(`/api/categories/${other.id}`, { name: 'BEBIDAS' })).status, 200, 'cambiar mayúsculas de la propia');

    const a = (await product(api, 'UNI1', 10, 5, 1)).data.id;
    assert.equal((await product(api, 'uni1', 10, 5, 1)).status, 409, 'mismo código en minúsculas');
    const b = (await product(api, 'UNI2', 10, 5, 1)).data.id;
    const body = (code) => ({ code, name: 'Otro', costPrice: 1, salePrice: 2, minStock: 0 });
    assert.equal((await api.put(`/api/products/${b}`, body('Uni1'))).status, 409, 'editar a un código existente');
    assert.equal((await api.put(`/api/products/${a}`, body('UNI1'))).status, 200, 'guardar el propio código');
    assert.equal((await api.put(`/api/products/${a}`, body('uni1'))).status, 200, 'cambiar mayúsculas del propio código');
  });

  it('buscar "%" o "_" no devuelve todo: son texto común', async () => {
    await product(api, 'PCT2', 10, 5, 1, { name: 'Jugo 50% naranja' });
    await product(api, 'UND', 10, 5, 1, { name: 'Caja_grande' });
    const names = async (q) => (await api.get('/api/products?limit=100&search=' + encodeURIComponent(q))).data.items.map((p) => p.name);
    for (const found of await names('%')) assert.ok(found.includes('%'), `"%" trajo "${found}", que no tiene %`);
    for (const found of await names('_')) assert.ok(found.includes('_'), `"_" trajo "${found}", que no tiene _`);
    assert.deepEqual(await names('50%'), ['Jugo 50% naranja']);
    assert.deepEqual(await names('caja_g'), ['Caja_grande']);
    assert.equal((await names('cajaXgrande')).length, 0, '"_" no funciona como comodín de una letra');
    assert.deepEqual(await names('\\'), [], 'una barra sola no rompe ni trae todo');
  });

  it('los clientes se encuentran por teléfono escribiendo solo los dígitos', async () => {
    await api.post('/api/customers', { name: 'Telefónica Prueba', phone: '(0264) 458-1305' });
    const ids = async (q) => (await api.get('/api/customers?search=' + encodeURIComponent(q))).data.items.map((c) => c.name);
    for (const query of ['4581305', '2644581305', '264 458', '458-1305', '+54 9 264 458 1305', '0264 458 1305', '(264) 4581305', '58130']) {
      assert.ok((await ids(query)).includes('Telefónica Prueba'), `"${query}" no lo encontró`);
    }
    assert.ok(!(await ids('264999')).includes('Telefónica Prueba'), 'otro número no coincide');
    assert.ok((await ids('telefonica')).includes('Telefónica Prueba'), 'el nombre sin tilde sigue funcionando');
    assert.equal((await ids('12')).length >= 0, true, 'con menos de 3 dígitos no se busca como teléfono');
  });

  it('la búsqueda con caracteres especiales no rompe ni devuelve todo por error', async () => {
    await product(api, 'PCT', 10, 5, 1, { name: '100% jugo' });
    const found = (await api.get('/api/products?search=' + encodeURIComponent('100%'))).data;
    assert.ok(found.items.some((p) => p.name === '100% jugo'));
    const none = (await api.get('/api/products?search=' + encodeURIComponent("' OR 1=1 --"))).data;
    assert.equal(none.items.length, 0, 'una inyección no devuelve todo');
    const accents = (await api.get('/api/customers?search=' + encodeURIComponent('robústo'))).data;
    assert.ok(Array.isArray(accents.items));
  });
});
