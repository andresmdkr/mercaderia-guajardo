const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export const formatMoney = (value) => currency.format(value);

export const formatDateTime = (value) => dateTime.format(new Date(value));
