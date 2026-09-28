'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      address: { type: Sequelize.STRING(200), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('customers', ['name']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('customers');
  },
};
