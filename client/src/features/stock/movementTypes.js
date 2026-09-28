// Tipos de movimiento. `sale` y `sale_void` los genera el módulo de Ventas.
export const MOVEMENT_TYPES = {
  in: { label: 'Entrada', color: 'success' },
  out: { label: 'Salida', color: 'warning' },
  adjustment: { label: 'Ajuste', color: 'info' },
  sale: { label: 'Venta', color: 'primary' },
  sale_void: { label: 'Anulación', color: 'default' },
};

// Los que se pueden cargar a mano desde la pantalla de Stock.
export const MANUAL_TYPES = ['in', 'out', 'adjustment'];

// Atajos para no escribir el motivo cada vez.
export const REASON_SUGGESTIONS = {
  in: ['Compra a proveedor', 'Devolución de cliente'],
  out: ['Vencido', 'Rotura', 'Consumo propio', 'Regalo'],
  adjustment: ['Conteo de stock', 'Error de carga'],
};

// Stock que quedaría después del movimiento (o null si faltan datos), para mostrarlo antes de guardar.
export function previewStock(type, currentStock, quantity, newStock) {
  if (type === 'adjustment') return newStock === '' ? null : Number(newStock);
  if (quantity === '' || !Number.isInteger(Number(quantity))) return null;
  return type === 'in' ? currentStock + Number(quantity) : currentStock - Number(quantity);
}
