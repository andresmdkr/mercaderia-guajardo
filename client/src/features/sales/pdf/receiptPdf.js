// Comprobante de venta en PDF (A4). Se genera en el navegador con los datos de la venta.
// Los imports llevan la extensión .js para poder probar este módulo también desde Node.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTimeLong, formatMoney, formatVoucherNumber } from '../../../utils/format.js';
import { PAYMENT_METHODS } from '../salesConstants.js';

const MARGIN = 15;
const LEGEND = 'Comprobante no válido como factura';

const GRAY = [110, 110, 110];
const DARK = [30, 30, 30];
const LINE = [215, 210, 198];

// Dibuja texto que puede ocupar varias líneas y devuelve la posición "y" donde termina.
function paragraph(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawHeader(doc, sale, business) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightX = pageWidth - MARGIN;
  const leftWidth = pageWidth / 2 - MARGIN - 12;

  // Izquierda: datos del negocio
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  let leftY = paragraph(doc, business.name, MARGIN, 21, leftWidth, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  leftY += 1;
  for (const line of [business.address, business.phone, business.email].filter(Boolean)) {
    leftY = paragraph(doc, line, MARGIN, leftY, leftWidth, 4.5);
  }

  // Centro: la "X" de los documentos no fiscales
  const boxSize = 16;
  const boxX = pageWidth / 2 - boxSize / 2;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.5);
  doc.rect(boxX, 13, boxSize, boxSize);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('X', pageWidth / 2, 25, { align: 'center' });

  // Derecha: comprobante, número y fecha
  doc.setFontSize(14);
  doc.text('COMPROBANTE', rightX, 20, { align: 'right' });
  doc.setFontSize(11);
  doc.text(`N° ${formatVoucherNumber(sale.id)}`, rightX, 27, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Fecha: ${formatDateTimeLong(sale.createdAt)}`, rightX, 33, { align: 'right' });

  const bottom = Math.max(leftY, 36) + 3;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, bottom, rightX, bottom);
  return bottom + 7;
}

function drawSaleInfo(doc, sale, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const columnX = pageWidth / 2 + 5;
  let y = startY;

  const row = (label, value, x, rowY) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text(label, x, rowY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(String(value), x + 27, rowY);
  };

  const customer = sale.customer?.name ?? 'Consumidor final';
  row('Cliente:', customer, MARGIN, y);
  row('Medio de pago:', PAYMENT_METHODS[sale.paymentMethod] ?? sale.paymentMethod, columnX, y);
  y += 5.5;
  if (sale.customer?.phone) row('Teléfono:', sale.customer.phone, MARGIN, y);
  row('Atendió:', sale.user?.name ?? '', columnX, y);
  y += 5.5;

  if (sale.status === 'voided') {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(190, 40, 40);
    const by = sale.voidedByUser?.name ? ` por ${sale.voidedByUser.name}` : '';
    const reason = sale.voidReason ? `. Motivo: ${sale.voidReason}` : '';
    y = paragraph(doc, `VENTA ANULADA el ${formatDateTimeLong(sale.voidedAt)}${by}${reason}`, MARGIN, y, pageWidth - MARGIN * 2, 4.5);
  }
  return y + 3;
}

function drawItemsTable(doc, sale, startY) {
  autoTable(doc, {
    startY,
    margin: { left: MARGIN, right: MARGIN, bottom: 28 },
    head: [['Código', 'Producto', 'Cant.', 'Precio', 'Subtotal']],
    body: sale.items.map((item) => [
      item.productCode,
      item.productName,
      String(item.quantity),
      formatMoney(item.unitPrice),
      formatMoney(item.lineTotal),
    ]),
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: DARK, lineColor: LINE },
    headStyles: { fillColor: [243, 240, 231], textColor: DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [251, 250, 246] },
    columnStyles: {
      0: { cellWidth: 26 },
      2: { halign: 'right', cellWidth: 16 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 32 },
    },
    // Los encabezados de columnas numéricas también van alineados a la derecha.
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 2) data.cell.styles.halign = 'right';
    },
  });
  return doc.lastAutoTable.finalY;
}

function drawTotals(doc, sale, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const valueX = pageWidth - MARGIN;
  const labelX = valueX - 70; // ancho de sobra para montos grandes y "Descuento (100%)"

  // Si no entra el bloque de totales en lo que queda de la hoja, va a la página siguiente.
  let y = startY + 9;
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 25;
  }

  const line = (label, value, { bold = false, size = 10, color = DARK } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(label, labelX, y);
    doc.text(value, valueX, y, { align: 'right' });
    y += size > 10 ? 8 : 5.5;
  };

  line('Subtotal', formatMoney(sale.subtotal), { color: GRAY });
  if (sale.discountAmount > 0) {
    const label = sale.discountType === 'percent' ? `Descuento (${sale.discountValue}%)` : 'Descuento';
    line(label, `- ${formatMoney(sale.discountAmount)}`, { color: GRAY });
  }
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.line(labelX, y - 3, valueX, y - 3);
  y += 1.5;
  line('TOTAL', formatMoney(sale.total), { bold: true, size: 13 });

  if (sale.notes) {
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    doc.text('Notas:', MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    paragraph(doc, sale.notes, MARGIN + 12, y, pageWidth - MARGIN * 2 - 12, 4.5);
  }
}

// Pie con la leyenda legal (en todas las páginas) y marca de agua si la venta está anulada.
function drawPageDecorations(doc, sale) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, pageHeight - 20, pageWidth - MARGIN, pageHeight - 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(LEGEND, pageWidth / 2, pageHeight - 13, { align: 'center' });
    if (pages > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`Página ${page} de ${pages}`, pageWidth - MARGIN, pageHeight - 13, { align: 'right' });
    }

    if (sale.status === 'voided') {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.13 }));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(96);
      doc.setTextColor(200, 30, 30);
      doc.text('ANULADA', pageWidth / 2 - 55, pageHeight / 2 + 45, { angle: 35 });
      doc.restoreGraphicsState();
    }
  }
}

/**
 * Arma el PDF del comprobante.
 * @param sale     venta con detalle (items, customer, user, voidedByUser...)
 * @param business datos del negocio { name, address, phone, email }
 */
export function buildReceiptPdf(sale, business) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: `Comprobante ${formatVoucherNumber(sale.id)}`, subject: LEGEND });

  let y = drawHeader(doc, sale, business);
  y = drawSaleInfo(doc, sale, y);
  y = drawItemsTable(doc, sale, y);
  drawTotals(doc, sale, y);
  drawPageDecorations(doc, sale);
  return doc;
}

// Abre el comprobante en una pestaña nueva (para imprimirlo o guardarlo). Si el navegador
// bloquea la ventana emergente, lo descarga directamente.
export function openReceiptPdf(sale, business) {
  const doc = buildReceiptPdf(sale, business);
  const url = URL.createObjectURL(doc.output('blob'));
  const tab = window.open(url, '_blank');
  if (!tab) doc.save(`comprobante-${formatVoucherNumber(sale.id)}.pdf`);
}
