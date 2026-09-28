// Cálculo de la venta en centavos enteros (evita errores de decimales).
// Es una vista previa: el servidor vuelve a calcular todo con los precios de la base.

const toCents = (amount) => Math.round(Number(amount) * 100);

export const centsToMoney = (cents) => cents / 100;

export function computeTotals(lines, discount) {
  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.product.salePrice) * line.quantity, 0);

  const value = Number(discount.value);
  const hasDiscount = discount.value !== '' && Number.isFinite(value) && value > 0;

  let discountCents = 0;
  let discountError = null;
  if (hasDiscount) {
    discountCents = discount.type === 'percent' ? Math.round((subtotalCents * value) / 100) : toCents(value);
    if (discount.type === 'percent' && value > 100) discountError = 'El porcentaje no puede superar 100';
    else if (discountCents > subtotalCents) discountError = 'El descuento supera el subtotal';
  } else if (discount.value !== '' && (!Number.isFinite(value) || value < 0)) {
    discountError = 'Descuento inválido';
  }

  const appliedDiscountCents = discountError ? 0 : discountCents;
  return {
    subtotalCents,
    discountCents: appliedDiscountCents,
    discountError,
    totalCents: subtotalCents - appliedDiscountCents,
  };
}
