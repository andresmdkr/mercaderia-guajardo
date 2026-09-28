const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    },
    { tableName: 'users', underscored: true }
  );

  // Nunca devolver el hash en las respuestas JSON.
  User.prototype.toJSON = function toJSON() {
    const data = { ...this.get() };
    delete data.passwordHash;
    return data;
  };

  return User;
};
