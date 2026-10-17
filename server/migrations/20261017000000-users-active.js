'use strict';

// Varias personas pueden usar el programa (cada una con su usuario): un usuario se da de baja, no se borra, porque
// las ventas y los movimientos de stock guardan quién los hizo. Solo agrega una columna con valor por defecto
// (todos los usuarios que ya existen quedan activos).

module.exports = {
  async up(queryInterface, Sequelize, { transaction }) {
    await queryInterface.sequelize.query('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))', { transaction });
  },

  async down(queryInterface, Sequelize, { transaction }) {
    await queryInterface.sequelize.query('ALTER TABLE users DROP COLUMN active', { transaction });
  },
};
