'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING(100), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // Único sin distinguir mayúsculas: "Almacén" y "almacén" son la misma categoría.
    await queryInterface.sequelize.query('CREATE UNIQUE INDEX categories_name_lower_unique ON categories (LOWER(name))');

    await queryInterface.addColumn('products', 'category_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'categories', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    await queryInterface.addIndex('products', ['category_id']);

    // Pasa las categorías que estaban como texto a la tabla nueva (sin duplicados por mayúsculas).
    await queryInterface.sequelize.query(`
      INSERT INTO categories (name, created_at, updated_at)
      SELECT DISTINCT ON (LOWER(TRIM(category))) TRIM(category), NOW(), NOW()
      FROM products
      WHERE category IS NOT NULL AND TRIM(category) <> ''
      ORDER BY LOWER(TRIM(category)), TRIM(category)
    `);
    await queryInterface.sequelize.query(`
      UPDATE products p SET category_id = c.id
      FROM categories c
      WHERE p.category IS NOT NULL AND LOWER(TRIM(p.category)) = LOWER(c.name)
    `);

    await queryInterface.removeIndex('products', ['category']);
    await queryInterface.removeColumn('products', 'category');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('products', 'category', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.sequelize.query(`
      UPDATE products p SET category = c.name FROM categories c WHERE p.category_id = c.id
    `);
    await queryInterface.addIndex('products', ['category']);

    await queryInterface.removeIndex('products', ['category_id']);
    await queryInterface.removeColumn('products', 'category_id');
    await queryInterface.dropTable('categories');
  },
};
