const { DataTypes } = require('sequelize');

// Una sola fila (id = 1) con los datos del negocio.
module.exports = (sequelize) =>
  sequelize.define(
    'BusinessSettings',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
      name: { type: DataTypes.STRING(100), allowNull: false },
      address: { type: DataTypes.STRING(200), allowNull: true },
      phone: { type: DataTypes.STRING(50), allowNull: true },
      email: { type: DataTypes.STRING(150), allowNull: true },
    },
    { tableName: 'business_settings', underscored: true }
  );
