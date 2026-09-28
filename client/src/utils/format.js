const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export const formatMoney = (value) => currency.format(value);

// Número de venta con ceros a la izquierda: 12 → "#0012"
export const formatSaleNumber = (id) => `#${String(id).padStart(4, '0')}`;

// Número de comprobante propio: punto de venta fijo 0001 + número de venta → "0001-00000012"
export const formatVoucherNumber = (id) => `0001-${String(id).padStart(8, '0')}`;

const dateTimeLong = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

// "28/09/2026, 21:54"
export const formatDateTimeLong = (value) => dateTimeLong.format(new Date(value));

export const formatDateTime = (value) => dateTime.format(new Date(value));
