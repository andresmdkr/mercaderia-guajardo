'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category: { type: Sequelize.STRING(100), allowNull: true },
      cost_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      sale_price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      min_stock: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('products', ['name']);
    await queryInterface.addIndex('products', ['category']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
