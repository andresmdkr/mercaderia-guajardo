const { DataTypes } = require('sequelize');
const moneyField = require('./moneyField');

module.exports = (sequelize) =>
  sequelize.define(
    'Sale',
    {
      paymentMethod: { type: DataTypes.STRING(20), allowNull: false }, // cash | transfer | card
      subtotal: moneyField('subtotal'),
      discountType: { type: DataTypes.STRING(10), allowNull: true }, // amount | percent
      discountValue: moneyField('discountValue', { allowNull: true }),
      discountAmount: moneyField('discountAmount'),
      total: moneyField('total'),
      notes: { type: DataTypes.STRING(300), allowNull: true },
      status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'completed' }, // completed | voided
      voidedAt: { type: DataTypes.DATE, allowNull: true },
      voidReason: { type: DataTypes.STRING(200), allowNull: true },
    },
    { tableName: 'sales', underscored: true }
  );
