'use strict';

// Actualización masiva de precios: cada operación queda como un "lote" (price_batches) con el detalle de lo que
// cambió en cada producto (price_changes, con el valor anterior y el nuevo). Así se puede deshacer.
// Solo agrega tablas: no toca las existentes, por eso una versión anterior de la app sigue leyendo la base.
// Dinero: INTEGER en centavos. Porcentajes: en centésimas de punto (10,5 % = 1050), sin decimales flotantes.

const STATEMENTS = [
  `CREATE TABLE price_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    percent_bp INTEGER NOT NULL,
    cost_percent_bp INTEGER,
    category_name TEXT,
    round_to INTEGER NOT NULL DEFAULT 0 CHECK (round_to >= 0),
    changed_count INTEGER NOT NULL CHECK (changed_count >= 0),
    undone_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  `CREATE TABLE price_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL REFERENCES price_batches (id) ON UPDATE CASCADE ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    old_price INTEGER NOT NULL,
    new_price INTEGER NOT NULL CHECK (new_price >= 0),
    old_cost INTEGER NOT NULL,
    new_cost INTEGER NOT NULL CHECK (new_cost >= 0),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
  )`,
  'CREATE INDEX price_changes_batch_id ON price_changes (batch_id)',
];

module.exports = {
  async up(queryInterface, Sequelize, { transaction }) {
    for (const sql of STATEMENTS) await queryInterface.sequelize.query(sql, { transaction });
  },

  async down(queryInterface, Sequelize, { transaction }) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS price_changes', { transaction });
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS price_batches', { transaction });
  },
};
