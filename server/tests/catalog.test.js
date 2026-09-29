const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { loginAsAdmin, product, startTestServer } = require('./helpers/testServer');

// Productos, categorías y clientes.
describe('catálogo', () => {
  let server;
  let api;

  before(async () => {
    server = await startTestServer();
    api = server.client();
    await loginAsAdmin(api);
  });

  after(() => server.close());

  describe('base de datos', () => {
    it('usa WAL y tiene activadas las claves foráneas', async () => {
      assert.equal((await server.db.get('PRAGMA journal_mode')).journal_mode, 'wal');
    });
  });

  describe('productos', () => {
    it('crea un producto y devuelve los importes en pesos (guardados en centavos)', async () => {
      const response = await api.post('/api/products', { code: 'P100', name: 'Yerba', costPrice: 1500.5, salePrice: 100.1, minStock: 5 });
      assert.equal(response.status, 201);
      assert.equal(response.data.costPrice, 1500.5);
      assert.equal(response.data.salePrice, 100.1);
      assert.equal(response.data.stock, 0);
      assert.equal(response.data.category, null);

      const row = await server.db.get('SELECT cost_price, sale_price FROM products WHERE code = ?', ['P100']);
      assert.deepEqual(row, { cost_price: 150050, sale_price: 10010 }, 'en la base son enteros en centavos');
    });

    it('rechaza códigos repetidos (409 con mensaje claro) y datos inválidos (400)', async () => {
      const duplicate = await api.post('/api/products', { code: 'P100', name: 'Otra', costPrice: 1, salePrice: 2 });
      assert.equal(duplicate.status, 409);
      assert.equal(duplicate.data.message, 'Ya existe un producto con ese código');

      const invalid = [
        { code: 'X1', name: 'x', costPrice: 1, salePrice: 2, stock: 5 },
        { code: 'X1', name: 'x', costPrice: -1, salePrice: 2 },
        { code: 'X1', name: 'x', costPrice: 1, salePrice: 'abc' },
        { name: 'sin código', costPrice: 1, salePrice: 2 },
        { code: 'X1', name: 'x', costPrice: 1, salePrice: 2, minStock: 1.5 },
        { code: 'X1', name: 'x', costPrice: 1, salePrice: 2, initialStock: -3 },
        { code: 'X1', name: 'x', costPrice: 1, salePrice: 2, categoryId: 99999 },
      ];
      for (const body of invalid) assert.equal((await api.post('/api/products', body)).status, 400, JSON.stringify(body));
      assert.equal((await api.post('/api/products', 'no-es-json')).status, 400);
    });

    it('edita un producto sin tocar su stock y valida el código repetido', async () => {
      const created = (await product(api, 'P200', 50, 20, 7)).data;
      const updated = await api.put(`/api/products/${created.id}`, { code: 'P200', name: 'Renombrado', costPrice: 25, salePrice: 60, minStock: 2 });
      assert.equal(updated.status, 200);
      assert.equal(updated.data.name, 'Renombrado');
      assert.equal(updated.data.salePrice, 60);
      assert.equal(updated.data.stock, 7);
      const clash = await api.put(`/api/products/${created.id}`, { code: 'P100', name: 'x', costPrice: 1, salePrice: 2 });
      assert.equal(clash.status, 409);
    });

    it('busca por código exacto sin distinguir mayúsculas', async () => {
      assert.equal((await api.get('/api/products/by-code/p100')).data.code, 'P100');
      assert.equal((await api.get('/api/products/by-code/NOEXISTE')).status, 404);
      const baja = (await product(api, 'PBAJA', 1, 1, 1)).data;
      await api.patch(`/api/products/${baja.id}/status`, { active: false });
      assert.equal((await api.get('/api/products/by-code/PBAJA')).status, 409, 'un producto de baja no se puede vender');
    });

    it('lista con búsqueda, categoría, stock bajo, baja lógica y paginación', async () => {
      const category = (await api.post('/api/categories', { name: 'Bebidas' })).data;
      await product(api, 'B1', 10, 5, 1, { name: 'Gaseosa Cola', minStock: 5, categoryId: category.id });
      await product(api, 'B2', 10, 5, 50, { name: 'Agua', minStock: 5, categoryId: category.id });

      const byName = await api.get('/api/products?search=gaseosa');
      assert.deepEqual(byName.data.items.map((p) => p.code), ['B1'], 'la búsqueda no distingue mayúsculas');
      assert.deepEqual((await api.get('/api/products?search=b2')).data.items.map((p) => p.code), ['B2'], 'busca también por código');

      const inCategory = await api.get(`/api/products?categoryId=${category.id}`);
      assert.equal(inCategory.data.total, 2);
      assert.equal(inCategory.data.items[0].category.name, 'Bebidas');

      const low = await api.get('/api/products?lowStock=true');
      assert.ok(low.data.items.every((p) => p.stock <= p.minStock));
      assert.ok(low.data.items.some((p) => p.code === 'B1'));
      assert.ok(!low.data.items.some((p) => p.code === 'B2'));

      const inactive = await api.get('/api/products?active=false');
      assert.deepEqual(inactive.data.items.map((p) => p.code), ['PBAJA']);
      assert.ok(!(await api.get('/api/products?active=true')).data.items.some((p) => p.code === 'PBAJA'));

      const page1 = await api.get('/api/products?limit=2&page=1');
      const page2 = await api.get('/api/products?limit=2&page=2');
      assert.equal(page1.data.items.length, 2);
      assert.equal(page1.data.pages, Math.ceil(page1.data.total / 2));
      assert.notEqual(page1.data.items[0].id, page2.data.items[0].id);
      assert.equal((await api.get('/api/products?active=quizas')).status, 400);
      assert.equal((await api.get('/api/products/abc')).status, 400);
      assert.equal((await api.get('/api/products/99999')).status, 404);
    });

    it('la base rechaza precios y stock negativos aunque el código falle', async () => {
      await assert.rejects(server.db.run('UPDATE products SET stock = -1 WHERE code = ?', ['P100']), /CHECK constraint/);
      await assert.rejects(server.db.run('UPDATE products SET sale_price = -5 WHERE code = ?', ['P100']), /CHECK constraint/);
    });
  });

  describe('categorías', () => {
    it('crea, no admite nombres repetidos sin importar mayúsculas, y renombra', async () => {
      const created = await api.post('/api/categories', { name: 'Limpieza' });
      assert.equal(created.status, 201);
      const dup = await api.post('/api/categories', { name: 'LIMPIEZA' });
      assert.equal(dup.status, 409);
      assert.equal(dup.data.message, 'Ya existe una categoría con ese nombre');
      assert.equal((await api.post('/api/categories', { name: '  ' })).status, 400);

      const other = (await api.post('/api/categories', { name: 'Lácteos' })).data;
      const clash = await api.put(`/api/categories/${other.id}`, { name: 'limpieza' });
      assert.equal(clash.status, 409);
      const renamed = await api.put(`/api/categories/${other.id}`, { name: 'Lácteos y fiambres' });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.data.name, 'Lácteos y fiambres');
    });

    it('cuenta los productos de cada categoría y no borra las que tienen productos', async () => {
      const list = await api.get('/api/categories');
      const bebidas = list.data.find((c) => c.name === 'Bebidas');
      assert.equal(bebidas.productCount, 2);
      assert.equal(typeof bebidas.productCount, 'number');

      const blocked = await api.delete(`/api/categories/${bebidas.id}`);
      assert.equal(blocked.status, 409);
      assert.match(blocked.data.message, /2 producto/);

      const empty = list.data.find((c) => c.name === 'Limpieza');
      assert.equal((await api.delete(`/api/categories/${empty.id}`)).status, 204);
      assert.equal((await api.delete('/api/categories/99999')).status, 404);
    });
  });

  describe('clientes', () => {
    it('crea clientes (el nombre puede repetirse) y valida los datos', async () => {
      const full = await api.post('/api/customers', { name: 'María Pérez', phone: '11 5555-1234', email: 'maria@mail.com', address: 'Calle 1', notes: 'Paga los viernes' });
      assert.equal(full.status, 201);
      assert.equal((await api.post('/api/customers', { name: 'Juan Gómez' })).status, 201);
      assert.equal((await api.post('/api/customers', { name: 'Juan Gómez' })).status, 201, 'nombres repetidos permitidos');
      assert.equal((await api.post('/api/customers', { phone: '123' })).status, 400);
      assert.equal((await api.post('/api/customers', { name: 'X', email: 'no-es-email' })).status, 400);
    });

    it('avisa de teléfonos repetidos comparando solo los dígitos', async () => {
      const maria = (await api.get('/api/customers?search=maría')).data.items[0];
      const check = async (phone, exclude = '') => (await api.get(`/api/customers/phone-check?phone=${encodeURIComponent(phone)}${exclude}`)).data.duplicate;

      assert.equal((await check('1155551234')).id, maria.id, 'otro formato del mismo número');
      assert.equal((await check('(11) 5555.1234')).id, maria.id, 'con paréntesis y punto');
      assert.equal(await check('1155551234', `&excludeId=${maria.id}`), null, 'excluye al propio cliente');
      assert.equal(await check('12'), null, 'muy corto: no se compara');

      await api.post('/api/customers', { name: 'Con más', phone: '+54 (11) 5555-9999' });
      assert.ok(await check('541155559999'));
    });

    it('busca por nombre, teléfono y email, y da de baja sin borrar', async () => {
      assert.ok((await api.get('/api/customers?search=maria%40mail')).data.items.length >= 1);
      assert.ok((await api.get('/api/customers?search=5555-1234')).data.items.length >= 1);
      const gomez = (await api.get('/api/customers?search=gomez')).data;
      assert.equal(gomez.total, 0, 'LIKE de SQLite no ignora tildes: "gomez" no encuentra "Gómez"');
      assert.equal((await api.get('/api/customers?search=G%C3%B3mez')).data.total, 2);

      const one = (await api.get('/api/customers?search=G%C3%B3mez')).data.items[0];
      const off = await api.patch(`/api/customers/${one.id}/status`, { active: false });
      assert.equal(off.data.active, false);
      assert.equal((await api.get('/api/customers?active=false')).data.items.length, 1);
      assert.equal((await api.get('/api/customers?search=G%C3%B3mez&active=true')).data.total, 1);
      assert.equal((await api.get('/api/customers/99999')).status, 404);
    });
  });
});
