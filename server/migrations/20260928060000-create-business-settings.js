'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tabla de una sola fila (id = 1): los datos del negocio que van en el encabezado de los comprobantes.
    await queryInterface.createTable('business_settings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, defaultValue: 1 },
      name: { type: Sequelize.STRING(100), allowNull: false },
      address: { type: Sequelize.STRING(200), allowNull: true },
      phone: { type: Sequelize.STRING(50), allowNull: true },
      email: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.sequelize.query('ALTER TABLE business_settings ADD CONSTRAINT business_settings_single_row CHECK (id = 1)');
    await queryInterface.sequelize.query(
      "INSERT INTO business_settings (id, name, created_at, updated_at) VALUES (1, 'Mercadería Guajardo', NOW(), NOW())"
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('business_settings');
  },
};
