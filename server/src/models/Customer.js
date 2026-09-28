const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Customer',
    {
      name: { type: DataTypes.STRING(150), allowNull: false },
      phone: { type: DataTypes.STRING(50), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
      address: { type: DataTypes.STRING(200), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'customers', underscored: true }
  );
