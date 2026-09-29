// Resumen de ventas de un período en HTML, para imprimir (hoja A4 o ticket: el ancho se adapta). Documento autónomo, sin scripts.
// Los imports llevan la extensión .js para poder probar este módulo también desde Node.
import { formatDateTimeLong, formatInteger, formatMoney, formatPeriodLabel } from '../../../utils/format.js';
import { PAYMENT_METHODS } from '../salesConstants.js';
import { escapeHtml } from './htmlUtils.js';

const STYLES = `
  @page { margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e1e1e; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .business { font-size: 12px; color: #6e6e6e; }
  .day { font-size: 15px; font-weight: bold; margin: 14px 0 2px; }
  .day::first-letter { text-transform: uppercase; }
  hr { border: 0; border-top: 1px solid #d7d2c6; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f3f1ea; text-align: left; font-size: 11px; padding: 6px; }
  td { padding: 6px; border-bottom: 1px solid #ebe8de; }
  .num { text-align: right; white-space: nowrap; }
  .total td { border-top: 2px solid #1e1e1e; border-bottom: 0; font-size: 16px; font-weight: bold; padding-top: 8px; }
  .extra { margin-top: 14px; }
  .extra div { display: flex; justify-content: space-between; padding: 3px 6px; }
  .muted { color: #6e6e6e; }
  .footer { margin-top: 22px; padding-top: 8px; border-top: 1px solid #d7d2c6; font-size: 11px; color: #6e6e6e; text-align: center; }
`;

/**
 * @param summary resultado de GET /reports/period-summary: { from, to, salesCount, total, discounts, methods, voided }
 * @param business datos del negocio { name }
 * @param userName quién imprime
 * @returns documento HTML completo
 */
export function buildSummaryHtml(summary, business, userName) {
  const period = formatPeriodLabel(summary.from, summary.to);
  const rows = summary.methods
    .map(
      (m) => `<tr>
        <td>${escapeHtml(PAYMENT_METHODS[m.method] ?? m.method)}</td>
        <td class="num">${escapeHtml(formatInteger(m.salesCount))}</td>
        <td class="num">${escapeHtml(formatMoney(m.total))}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Resumen de ventas - ${escapeHtml(period)}</title>
<style>${STYLES}</style>
</head>
<body>
  <h1>Resumen de ventas</h1>
  <div class="business">${escapeHtml(business.name)}</div>
  <div class="day">${escapeHtml(period)}</div>
  <hr>
  <table>
    <thead><tr><th>Medio de pago</th><th class="num">Ventas</th><th class="num">Total cobrado</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total"><td>TOTAL</td><td class="num">${escapeHtml(formatInteger(summary.salesCount))}</td><td class="num">${escapeHtml(formatMoney(summary.total))}</td></tr>
    </tbody>
  </table>
  <div class="extra">
    <div class="muted"><span>Descuentos otorgados (ya restados del total)</span><span>${escapeHtml(formatMoney(summary.discounts))}</span></div>
    <div class="muted"><span>Ventas anuladas (no suman): ${escapeHtml(formatInteger(summary.voided.count))}</span><span>${escapeHtml(formatMoney(summary.voided.total))}</span></div>
  </div>
  <div class="footer">Resumen interno, no es un comprobante fiscal · Impreso el ${escapeHtml(formatDateTimeLong(new Date()))}${userName ? ` por ${escapeHtml(userName)}` : ''}</div>
</body>
</html>`;
}
