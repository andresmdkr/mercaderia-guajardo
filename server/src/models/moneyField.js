const { DataTypes } = require('sequelize');

// Columna de dinero. SQLite no tiene decimales exactos, así que el importe se guarda como un ENTERO
// en centavos (12,34 pesos = 1234) y el modelo lo entrega y recibe en pesos. Nunca float en la base.
function moneyField(field, { allowNull = false } = {}) {
  return {
    type: DataTypes.INTEGER,
    allowNull,
    defaultValue: allowNull ? null : 0,
    get() {
      const cents = this.getDataValue(field);
      return cents === null || cents === undefined ? null : cents / 100;
    },
    set(pesos) {
      this.setDataValue(field, pesos === null || pesos === undefined ? null : Math.round(Number(pesos) * 100));
    },
  };
}

module.exports = moneyField;
