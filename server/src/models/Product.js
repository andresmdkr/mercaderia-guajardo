const { DataTypes } = require('sequelize');

// DECIMAL llega como string desde Postgres; los getters lo devuelven como número.
const money = (field) => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull: false,
  defaultValue: 0,
  get() {
    return Number(this.getDataValue(field));
  },
});

module.exports = (sequelize) =>
  sequelize.define(
    'Product',
    {
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      category: { type: DataTypes.STRING(100), allowNull: true },
      costPrice: money('costPrice'),
      salePrice: money('salePrice'),
      stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'products', underscored: true }
  );
