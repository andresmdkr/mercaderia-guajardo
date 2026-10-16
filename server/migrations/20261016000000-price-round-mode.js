'use strict';

// Actualización de precios: ahora el redondeo puede ser al más cercano, hacia abajo o hacia arriba.
// Solo agrega una columna con valor por defecto (los lotes anteriores quedan como "al más cercano", que es lo que hacían).

module.exports = {
  async up(queryInterface, Sequelize, { transaction }) {
    await queryInterface.sequelize.query("ALTER TABLE price_batches ADD COLUMN round_mode TEXT NOT NULL DEFAULT 'nearest'", { transaction });
  },

  async down(queryInterface, Sequelize, { transaction }) {
    await queryInterface.sequelize.query('ALTER TABLE price_batches DROP COLUMN round_mode', { transaction });
  },
};
