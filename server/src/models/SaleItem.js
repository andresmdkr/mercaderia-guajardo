const { DataTypes } = require('sequelize');
const moneyField = require('./moneyField');

module.exports = (sequelize) =>
  sequelize.define(
    'SaleItem',
    {
      // Copia de los datos del producto al momento de la venta.
      productCode: { type: DataTypes.STRING(50), allowNull: false },
      productName: { type: DataTypes.STRING(150), allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      unitPrice: moneyField('unitPrice'),
      unitCost: moneyField('unitCost'),
      lineTotal: moneyField('lineTotal'),
    },
    { tableName: 'sale_items', underscored: true }
  );
