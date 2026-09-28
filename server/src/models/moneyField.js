const { DataTypes } = require('sequelize');

// Columna de dinero. Postgres devuelve DECIMAL como string; el getter lo entrega como número.
// Dinero siempre DECIMAL(12,2), nunca float (los cálculos se hacen en centavos, ver utils/money.js).
function moneyField(field, { allowNull = false } = {}) {
  return {
    type: DataTypes.DECIMAL(12, 2),
    allowNull,
    defaultValue: allowNull ? null : 0,
    get() {
      const raw = this.getDataValue(field);
      return raw === null ? null : Number(raw);
    },
  };
}

module.exports = moneyField;
