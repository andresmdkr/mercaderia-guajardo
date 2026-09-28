const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'StockMovement',
    {
      type: { type: DataTypes.STRING(20), allowNull: false },
      // Con signo: positivo suma stock, negativo resta.
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      stockBefore: { type: DataTypes.INTEGER, allowNull: false },
      stockAfter: { type: DataTypes.INTEGER, allowNull: false },
      reason: { type: DataTypes.STRING(200), allowNull: true },
    },
    { tableName: 'stock_movements', underscored: true }
  );
