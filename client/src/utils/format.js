const currency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const dateTime = new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' });

const compactCurrency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  notation: 'compact',
  compactDisplay: 'long', // "20 mil" en vez de "20 k"
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat('es-AR');

export const formatMoney = (value) => currency.format(value);

// Para ejes de gráficos: $ 12 mil, $ 1,5 M
export const formatCompactMoney = (value) => compactCurrency.format(value);

export const formatInteger = (value) => integer.format(value);

// Tamaño de un archivo: 340 KB, 1,2 MB
export const formatBytes = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

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
