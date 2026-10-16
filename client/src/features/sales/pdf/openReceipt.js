// Abre el comprobante en PDF. La librería que arma el PDF (jsPDF) es pesada: se descarga recién cuando se pide uno,
// así no hace más lenta la apertura de la aplicación.
export async function openReceiptPdf(sale, business) {
  const { openReceiptPdf: open } = await import('./receiptPdf');
  open(sale, business);
}
