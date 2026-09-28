// Cálculos de dinero en centavos enteros, para evitar errores de decimales (0.1 + 0.2).

const toCents = (amount) => Math.round(Number(amount) * 100);
const fromCents = (cents) => cents / 100;

module.exports = { toCents, fromCents };
