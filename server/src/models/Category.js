const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'Category',
    {
      name: { type: DataTypes.STRING(100), allowNull: false },
    },
    { tableName: 'categories', underscored: true }
  );
