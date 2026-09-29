'use strict';

// Esquema completo de la base (SQLite). Reemplaza a las 7 migraciones que se escribieron para PostgreSQL
// (siguen en el historial de git, etiqueta "postgres-version").
//
// Dinero: columnas INTEGER en centavos (SQLite no tiene decimales exactos).
// Fechas: DATETIME (Sequelize las guarda como texto en UTC).
// Las restricciones CHECK y las claves foráneas son la última defensa: aunque el código falle,
// la base rechaza stock negativo, totales que no cierran, tipos inválidos, etc.

const STATEMENTS = [
  `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  'CREATE UNIQUE INDEX users_username_unique ON users (username)',

  `CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  // Único sin distinguir mayúsculas: "Almacen" y "ALMACEN" son la misma categoría.
  'CREATE UNIQUE INDEX categories_name_lower_unique ON categories (LOWER(name))',

  `CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  'CREATE INDEX customers_name ON customers (name)',

  `CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category_id INTEGER REFERENCES categories (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    cost_price INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sale_price INTEGER NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  'CREATE UNIQUE INDEX products_code_unique ON products (code)',
  'CREATE INDEX products_name ON products (name)',
  'CREATE INDEX products_category_id ON products (category_id)',

  // Una sola fila (id = 1): los datos del negocio que van en el encabezado de los comprobantes.
  `CREATE TABLE business_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  `INSERT INTO business_settings (id, name, created_at, updated_at)
   VALUES (1, 'Mercadería Guajardo', datetime('now'), datetime('now'))`,

  // El id de la venta es también su número.
  `CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'card')),
    subtotal INTEGER NOT NULL,
    discount_type TEXT CHECK (discount_type IS NULL OR discount_type IN ('amount', 'percent')),
    discount_value INTEGER,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
    voided_at DATETIME,
    voided_by INTEGER REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    void_reason TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CHECK (subtotal >= 0 AND discount_amount >= 0 AND discount_amount <= subtotal AND total = subtotal - discount_amount)
  )`,
  'CREATE INDEX sales_created_at ON sales (created_at)',
  'CREATE INDEX sales_customer_id ON sales (customer_id)',

  // in = entrada, out = salida, adjustment = ajuste, sale = venta, sale_void = anulación.
  // quantity va con signo: positivo suma stock, negativo resta.
  `CREATE TABLE stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    sale_id INTEGER REFERENCES sales (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'sale_void')),
    quantity INTEGER NOT NULL CHECK (quantity <> 0),
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CHECK (stock_after = stock_before + quantity AND stock_after >= 0)
  )`,
  'CREATE INDEX stock_movements_product_id ON stock_movements (product_id)',
  'CREATE INDEX stock_movements_created_at ON stock_movements (created_at)',
  'CREATE INDEX stock_movements_sale_id ON stock_movements (sale_id)',

  // En cada ítem se guarda una copia del nombre, precio y costo al momento de vender.
  `CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_id INTEGER NOT NULL REFERENCES products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    CHECK (line_total = quantity * unit_price)
  )`,
  'CREATE UNIQUE INDEX sale_items_sale_product_unique ON sale_items (sale_id, product_id)',
  'CREATE INDEX sale_items_sale_id ON sale_items (sale_id)',
  'CREATE INDEX sale_items_product_id ON sale_items (product_id)',
];

const TABLES_IN_DROP_ORDER = ['sale_items', 'stock_movements', 'sales', 'business_settings', 'products', 'customers', 'categories', 'users'];

module.exports = {
  async up(queryInterface, Sequelize, { transaction }) {
    for (const sql of STATEMENTS) await queryInterface.sequelize.query(sql, { transaction });
  },

  async down(queryInterface, Sequelize, { transaction }) {
    for (const table of TABLES_IN_DROP_ORDER) await queryInterface.sequelize.query(`DROP TABLE IF EXISTS ${table}`, { transaction });
  },
};
