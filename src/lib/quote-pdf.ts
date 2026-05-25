import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { QuoteItem, QuoteSpecs } from './quote-utils';

export interface QuotePdfInput {
  customer?: string;
  specs: QuoteSpecs;
  qty: number;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
  taxRate?: number;
  company?: string;
}

export function exportQuotePdf(q: QuotePdfInput) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const currency = q.currency || 'EGP';
  const taxPct = ((q.taxRate ?? 0.14) * 100).toFixed(0);
  const company = q.company || 'Al-Azab';
  const date = new Date().toLocaleDateString('en-GB');
  const ref = 'Q-' + Date.now().toString().slice(-8);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(17, 17, 17);
  doc.text(company, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text('Price Quotation / عرض سعر', 14, 24);

  doc.setTextColor(40);
  doc.text(`Ref: ${ref}`, 196, 18, { align: 'right' });
  doc.text(`Date: ${date}`, 196, 24, { align: 'right' });

  // Gold line
  doc.setDrawColor(245, 191, 35);
  doc.setLineWidth(0.8);
  doc.line(14, 28, 196, 28);

  // Customer & specs block
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer / العميل:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(q.customer || '-', 50, 38);

  // Specs table
  autoTable(doc, {
    startY: 44,
    head: [['Specification', 'Value']],
    body: [
      ['Unit Type / نوع الوحدة', q.specs.unitType],
      ['Wood Type / نوع الخشب', q.specs.woodType],
      ['Length (mm) / الطول', String(q.specs.length)],
      ['Width (mm) / العرض', String(q.specs.width)],
      ['Thickness (mm) / السماكة', String(q.specs.thickness)],
      ['Finishing / التشطيب', q.specs.finishing || '-'],
      ['Quantity / الكمية', String(q.qty)],
      ['Notes / ملاحظات', q.specs.notes || '-'],
    ],
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [17, 17, 17], textColor: [245, 191, 35] },
    columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 'auto' } },
    margin: { left: 14, right: 14 },
  });

  // Items table
  const afterSpecs = (doc as any).lastAutoTable.finalY + 6;
  autoTable(doc, {
    startY: afterSpecs,
    head: [['#', 'Description / البند', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body: q.items.map((it, i) => [
      String(i + 1),
      it.description,
      String(it.qty),
      it.unit,
      it.unitPrice.toLocaleString(),
      it.total.toLocaleString(),
    ]),
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.5 },
    headStyles: { fillColor: [17, 17, 17], textColor: [245, 191, 35] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'center', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const y = (doc as any).lastAutoTable.finalY + 6;
  const labelX = 130;
  const valueX = 196;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal / المجموع الفرعي:', labelX, y, { align: 'right' });
  doc.text(`${q.subtotal.toLocaleString()} ${currency}`, valueX, y, { align: 'right' });
  doc.text(`Tax (${taxPct}%) / الضريبة:`, labelX, y + 6, { align: 'right' });
  doc.text(`${q.tax.toLocaleString()} ${currency}`, valueX, y + 6, { align: 'right' });

  doc.setDrawColor(245, 191, 35);
  doc.line(labelX - 50, y + 9, valueX, y + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total / الإجمالي:', labelX, y + 15, { align: 'right' });
  doc.text(`${q.total.toLocaleString()} ${currency}`, valueX, y + 15, { align: 'right' });

  // Footer
  const ph = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    'This quotation is valid for 14 days. Prices include materials, finishing & installation.',
    14, ph - 12,
  );
  doc.text(`${company} © ${new Date().getFullYear()}`, 196, ph - 12, { align: 'right' });

  doc.save(`quote-${ref}.pdf`);
}
