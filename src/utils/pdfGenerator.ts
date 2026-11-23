import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Company, Quote } from '../types/viverde';
import { formatEuro } from './calculations';

export function exportQuoteToPdf(quote: Quote, company: Company): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band in Verde Bosque (#183D32)
  doc.setFillColor(24, 61, 50);
  doc.rect(0, 0, pageWidth, 34, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(company.name, 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${company.address} · Tel: ${company.phone} · ${company.email}`, 14, 22);
  doc.text('VIVERDE STUDIO — Presupuesto de Paisajismo y Jardinería', 14, 28);

  // Quote number block on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`PRESUPUESTO ${quote.quoteNumber}`, pageWidth - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date(quote.createdAt).toLocaleDateString('es-ES')}`, pageWidth - 14, 21, { align: 'right' });
  doc.text(`Válido hasta: ${quote.validUntil}`, pageWidth - 14, 26, { align: 'right' });

  let cursorY = 42;

  // Client & Project Summary Box
  doc.setFillColor(244, 240, 231);
  doc.roundedRect(14, cursorY, pageWidth - 28, 28, 2, 2, 'F');
  doc.setTextColor(48, 54, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DATOS DEL CLIENTE', 18, cursorY + 7);
  doc.text('PROYECTO ASOCIADO', pageWidth / 2 + 4, cursorY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(quote.clientName || 'Cliente sin especificar', 18, cursorY + 13);
  doc.text(`${quote.clientEmail || ''} · ${quote.clientPhone || ''}`, 18, cursorY + 18);
  doc.text(quote.clientAddress || '', 18, cursorY + 23);

  doc.text(quote.projectName, pageWidth / 2 + 4, cursorY + 13);
  doc.text(`Estado: ${quote.status.toUpperCase()}`, pageWidth / 2 + 4, cursorY + 18);
  doc.text(`Superficies medidas: ${quote.surfacesSummary.length} zonas`, pageWidth / 2 + 4, cursorY + 23);

  cursorY += 35;

  // Optional 3D/2D preview snapshot
  if (quote.previewDataUrl && quote.previewDataUrl.startsWith('data:image/')) {
    try {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(24, 61, 50);
      doc.text('VISTA PREVIA DEL DISEÑO 2D / 3D', 14, cursorY);
      cursorY += 3;
      doc.addImage(quote.previewDataUrl, 'PNG', 14, cursorY, 92, 50);
      if (quote.surfacesSummary.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('RESUMEN DE SUPERFICIES', 112, cursorY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        quote.surfacesSummary.slice(0, 6).forEach((s, idx) => {
          doc.text(
            `• ${s.name}: ${s.areaM2} m² (perím. ${s.perimeterM} m) — ${formatEuro(s.cost)}`,
            112,
            cursorY + 11 + idx * 6,
          );
        });
      }
      cursorY += 56;
    } catch {
      // Skip image gracefully if canvas encoding is unsupported
    }
  }

  // Itemized Table
  autoTable(doc, {
    startY: cursorY,
    head: [['Concepto / Producto', 'Categoría', 'Cant.', 'Unidad', 'Precio Unit.', 'Importe']],
    body: quote.items.map((item) => [
      item.name,
      item.categoryGroup.replace('_', ' '),
      String(item.quantity),
      item.unit,
      formatEuro(item.unitPrice),
      formatEuro(item.total),
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
      textColor: [48, 54, 50],
    },
    headStyles: {
      fillColor: [24, 61, 50],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [249, 248, 245],
    },
    columnStyles: {
      2: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 40;
  let totalsY = finalY + 8;

  if (totalsY > 240) {
    doc.addPage();
    totalsY = 20;
  }

  // Totals Summary Box
  const summaryX = pageWidth - 88;
  doc.setFillColor(221, 232, 216);
  doc.roundedRect(summaryX, totalsY, 74, 46, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(48, 54, 50);

  const lines: [string, string][] = [
    ['Subtotal partidas:', formatEuro(quote.subtotal)],
    [`Descuento (${quote.discountPercent}%):`, `-${formatEuro(quote.discountAmount)}`],
    ['Transporte:', formatEuro(quote.transportCost)],
    ['Mano de obra:', formatEuro(quote.laborCost)],
    ['Instalación:', formatEuro(quote.installationCost)],
    [`IVA (${quote.vatRate}%):`, formatEuro(quote.vatAmount)],
  ];

  lines.forEach(([label, val], idx) => {
    doc.text(label, summaryX + 4, totalsY + 7 + idx * 5.5);
    doc.text(val, pageWidth - 18, totalsY + 7 + idx * 5.5, { align: 'right' });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 61, 50);
  doc.text('TOTAL FINAL:', summaryX + 4, totalsY + 42);
  doc.text(formatEuro(quote.total), pageWidth - 18, totalsY + 42, { align: 'right' });

  // Observations & Commercial Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(24, 61, 50);
  doc.text('OBSERVACIONES Y CONDICIONES:', 14, totalsY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 75, 72);
  const obsLines = doc.splitTextToSize(
    `${quote.notes || ''}\n${company.settings.commercialTerms || ''}`,
    summaryX - 20,
  );
  doc.text(obsLines, 14, totalsY + 12);

  doc.save(`${quote.quoteNumber}_${quote.projectName.replace(/\s+/g, '_')}.pdf`);
}
