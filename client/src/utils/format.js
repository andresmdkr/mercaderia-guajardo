const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export const formatMoney = (value) => currency.format(value);

// Número de venta con ceros a la izquierda: 12 → "#0012"
export const formatSaleNumber = (id) => `#${String(id).padStart(4, '0')}`;

export const formatDateTime = (value) => dateTime.format(new Date(value));
