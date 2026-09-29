import { buildReceiptHtml } from './receiptHtml';
import { printDocument } from './printDocument';

// Imprime el comprobante de una venta. Devuelve { ok, cancelled?, message? }.
export function printReceipt(sale, business) {
  return printDocument(buildReceiptHtml(sale, business));
}
