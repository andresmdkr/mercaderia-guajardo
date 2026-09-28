const { DataTypes } = require('sequelize');
const moneyField = require('./moneyField');

module.exports = (sequelize) =>
  sequelize.define(
    'Product',
    {
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      costPrice: moneyField('costPrice'),
      salePrice: moneyField('salePrice'),
      stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      minStock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'products', underscored: true }
  );
