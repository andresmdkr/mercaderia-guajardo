// Comprobante de venta en HTML, pensado para IMPRIMIR (hoja A4 o ticket de 80 mm: el ancho se adapta).
// Tiene el mismo contenido que el PDF (features/sales/pdf), pero se imprime como una página web,
// que es lo que Chromium imprime de forma confiable. Es un documento completo y autónomo (sin scripts).
// Los imports llevan la extensión .js para poder probar este módulo también desde Node.
import { formatDateTimeLong, formatMoney, formatVoucherNumber } from '../../../utils/format.js';
import { PAYMENT_METHODS } from '../salesConstants.js';

const LEGEND = 'Comprobante no válido como factura';

// Todo texto que viene de la base (nombres, notas...) pasa por acá antes de meterse en el HTML.
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STYLES = `
  @page { margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1e1e1e; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
  .business { font-size: 11px; color: #6e6e6e; line-height: 1.4; }
  .business strong { display: block; font-size: 18px; color: #1e1e1e; margin-bottom: 2px; }
  .box { border: 1.5px solid #1e1e1e; width: 44px; height: 44px; font-size: 28px; font-weight: bold; text-align: center; line-height: 44px; flex: none; }
  .voucher { text-align: right; }
  .voucher .title { font-size: 16px; font-weight: bold; }
  .voucher .number { font-size: 13px; font-weight: bold; margin-top: 2px; }
  .voucher .date { font-size: 11px; color: #6e6e6e; margin-top: 2px; }
  hr { border: 0; border-top: 1px solid #d7d2c6; margin: 12px 0; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 16px; }
  .info span { color: #6e6e6e; display: inline-block; min-width: 96px; }
  .voided { color: #be2828; font-weight: bold; font-size: 11px; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th { background: #f3f1ea; text-align: left; font-size: 11px; padding: 5px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #ebe8de; vertical-align: top; }
  th.num, td.num { text-align: right; white-space: nowrap; }
  tr { page-break-inside: avoid; }
  .totals { margin: 12px 0 0 auto; width: 55%; min-width: 220px; page-break-inside: avoid; }
  .totals div { display: flex; justify-content: space-between; padding: 2px 6px; }
  .totals .muted { color: #6e6e6e; }
  .totals .total { border-top: 1.5px solid #1e1e1e; margin-top: 4px; padding-top: 5px; font-size: 15px; font-weight: bold; }
  .notes { margin-top: 12px; font-size: 11px; }
  .notes span { color: #6e6e6e; font-weight: bold; }
  .legend { margin-top: 24px; padding-top: 10px; border-top: 1px solid #d7d2c6; text-align: center; font-weight: bold; font-size: 12px; }
  @media (max-width: 300px) { .header, .info { display: block; } .box { display: none; } .voucher { text-align: left; margin-top: 8px; } }
`;

/**
 * @param sale venta con items, customer, user (igual que la que usa el PDF)
 * @param business datos del negocio { name, address, phone, email }
 * @returns documento HTML completo
 */
export function buildReceiptHtml(sale, business) {
  const businessLines = [business.address, business.phone, business.email].filter(Boolean).map(escapeHtml).join('<br>');
  const customer = sale.customer?.name ?? 'Consumidor final';
  const payment = PAYMENT_METHODS[sale.paymentMethod] ?? sale.paymentMethod;

  const rows = sale.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.productCode)}</td>
        <td>${escapeHtml(item.productName)}</td>
        <td class="num">${escapeHtml(item.quantity)}</td>
        <td class="num">${escapeHtml(formatMoney(item.unitPrice))}</td>
        <td class="num">${escapeHtml(formatMoney(item.lineTotal))}</td>
      </tr>`
    )
    .join('');

  let voided = '';
  if (sale.status === 'voided') {
    const by = sale.voidedByUser?.name ? ` por ${sale.voidedByUser.name}` : '';
    const reason = sale.voidReason ? `. Motivo: ${sale.voidReason}` : '';
    voided = `<div class="voided">VENTA ANULADA el ${escapeHtml(formatDateTimeLong(sale.voidedAt))}${escapeHtml(by)}${escapeHtml(reason)}</div>`;
  }

  const discountLabel = sale.discountType === 'percent' ? `Descuento (${sale.discountValue}%)` : 'Descuento';
  const discount =
    sale.discountAmount > 0
      ? `<div class="muted"><span>${escapeHtml(discountLabel)}</span><span>- ${escapeHtml(formatMoney(sale.discountAmount))}</span></div>`
      : '';
  const notes = sale.notes ? `<div class="notes"><span>Notas:</span> ${escapeHtml(sale.notes)}</div>` : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Comprobante ${escapeHtml(formatVoucherNumber(sale.id))}</title>
<style>${STYLES}</style>
</head>
<body>
  <div class="header">
    <div class="business"><strong>${escapeHtml(business.name)}</strong>${businessLines}</div>
    <div class="box">X</div>
    <div class="voucher">
      <div class="title">COMPROBANTE</div>
      <div class="number">N° ${escapeHtml(formatVoucherNumber(sale.id))}</div>
      <div class="date">Fecha: ${escapeHtml(formatDateTimeLong(sale.createdAt))}</div>
    </div>
  </div>
  <hr>
  <div class="info">
    <div><span>Cliente:</span>${escapeHtml(customer)}</div>
    <div><span>Medio de pago:</span>${escapeHtml(payment)}</div>
    <div>${sale.customer?.phone ? `<span>Teléfono:</span>${escapeHtml(sale.customer.phone)}` : ''}</div>
    <div><span>Atendió:</span>${escapeHtml(sale.user?.name ?? '')}</div>
  </div>
  ${voided}
  <table>
    <thead><tr><th>Código</th><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="muted"><span>Subtotal</span><span>${escapeHtml(formatMoney(sale.subtotal))}</span></div>
    ${discount}
    <div class="total"><span>TOTAL</span><span>${escapeHtml(formatMoney(sale.total))}</span></div>
  </div>
  ${notes}
  <div class="legend">${LEGEND}</div>
</body>
</html>`;
}
