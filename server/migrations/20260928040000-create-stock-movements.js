'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_movements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // in = entrada, out = salida, adjustment = ajuste (después: sale, sale_void)
      type: { type: Sequelize.STRING(20), allowNull: false },
      // Con signo: positivo suma stock, negativo resta.
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      stock_before: { type: Sequelize.INTEGER, allowNull: false },
      stock_after: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(200), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex('stock_movements', ['product_id']);
    await queryInterface.addIndex('stock_movements', ['created_at']);

    await queryInterface.sequelize.query(
      'ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_quantity_not_zero CHECK (quantity <> 0)'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_consistent CHECK (stock_after = stock_before + quantity AND stock_after >= 0)'
    );
    // Último candado: la base nunca acepta stock negativo, pase lo que pase en el código.
    await queryInterface.sequelize.query('ALTER TABLE products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0)');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE products DROP CONSTRAINT products_stock_non_negative');
    await queryInterface.dropTable('stock_movements');
  },
};
