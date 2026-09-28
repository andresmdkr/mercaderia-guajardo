'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const money = { type: Sequelize.DECIMAL(12, 2), allowNull: false };
    const fk = (table, allowNull = false) => ({
      type: Sequelize.INTEGER,
      allowNull,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.createTable('sales', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true }, // también es el número de venta
      customer_id: fk('customers', true), // null = consumidor final
      user_id: fk('users'),
      payment_method: { type: Sequelize.STRING(20), allowNull: false },
      subtotal: money,
      discount_type: { type: Sequelize.STRING(10), allowNull: true },
      discount_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      discount_amount: { ...money, defaultValue: 0 },
      total: money,
      notes: { type: Sequelize.STRING(300), allowNull: true },
      status: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'completed' },
      voided_at: { type: Sequelize.DATE, allowNull: true },
      voided_by: fk('users', true),
      void_reason: { type: Sequelize.STRING(200), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('sales', ['created_at']);
    await queryInterface.addIndex('sales', ['customer_id']);

    await sequelize.query(`ALTER TABLE sales
      ADD CONSTRAINT sales_payment_method_valid CHECK (payment_method IN ('cash', 'transfer', 'card')),
      ADD CONSTRAINT sales_status_valid CHECK (status IN ('completed', 'voided')),
      ADD CONSTRAINT sales_discount_type_valid CHECK (discount_type IS NULL OR discount_type IN ('amount', 'percent')),
      ADD CONSTRAINT sales_amounts_consistent CHECK (
        subtotal >= 0 AND discount_amount >= 0 AND discount_amount <= subtotal AND total = subtotal - discount_amount
      )`);

    await queryInterface.createTable('sale_items', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      sale_id: fk('sales'),
      product_id: fk('products'),
      // Copia de los datos al momento de vender: si después cambian, la venta no se altera.
      product_code: { type: Sequelize.STRING(50), allowNull: false },
      product_name: { type: Sequelize.STRING(150), allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price: money,
      unit_cost: money,
      line_total: money,
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('sale_items', ['sale_id']);
    await queryInterface.addIndex('sale_items', ['product_id']);
    await queryInterface.addConstraint('sale_items', {
      type: 'unique',
      fields: ['sale_id', 'product_id'],
      name: 'sale_items_sale_product_unique',
    });
    await sequelize.query(`ALTER TABLE sale_items
      ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity > 0),
      ADD CONSTRAINT sale_items_line_total_consistent CHECK (line_total = quantity * unit_price)`);

    await queryInterface.addColumn('stock_movements', 'sale_id', fk('sales', true));
    await queryInterface.addIndex('stock_movements', ['sale_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('stock_movements', 'sale_id');
    await queryInterface.dropTable('sale_items');
    await queryInterface.dropTable('sales');
  },
};
