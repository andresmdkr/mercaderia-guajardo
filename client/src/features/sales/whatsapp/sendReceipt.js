import { desktop } from '../../../services/desktop';
import { formatVoucherNumber } from '../../../utils/format';
import { buildReceiptPdf } from '../pdf/receiptPdf';

// Los enlaces de WhatsApp abren un chat pero no adjuntan archivos. En la app instalada, el PDF se guarda y queda copiado
// como archivo (en el chat se pega con Ctrl+V); en el navegador común se descarga y se abre el chat para adjuntarlo a mano.
// `url` es el enlace wa.me del destinatario. Devuelve { ok, message, manual, copied, autoPaste }.
export async function sendReceiptByWhatsapp(sale, business, url) {
  const doc = buildReceiptPdf(sale, business);
  const filename = `comprobante-${formatVoucherNumber(sale.id)}.pdf`;

  if (!desktop?.shareWhatsappFile) {
    doc.save(filename);
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true, manual: true };
  }
  const base64 = doc.output('datauristring').split(',')[1]; // "data:application/pdf;filename=...;base64,<datos>"
  return desktop.shareWhatsappFile({ url, filename, base64 });
}

// Texto para el aviso que se muestra después de enviar.
export function describeShareResult(result) {
  if (!result.ok) return { severity: 'error', text: result.message ?? 'No se pudo enviar el comprobante' };
  if (result.manual) return { severity: 'info', text: 'Se descargó el PDF y se abrió WhatsApp: adjuntalo al chat.' };
  if (!result.copied) return { severity: 'warning', text: 'No se pudo copiar el comprobante. Se abrió su carpeta: arrastralo al chat.' };
  return {
    severity: 'success',
    text: result.autoPaste
      ? 'Comprobante listo: se pega solo cuando se abre el chat. Revisalo y tocá Enviar.'
      : 'Comprobante copiado. En el chat de WhatsApp pegalo con Ctrl+V y tocá Enviar.',
  };
}
