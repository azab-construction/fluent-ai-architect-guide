export interface QuoteItem {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuoteSpecs {
  unitType: string;
  woodType: string;
  length: number; // mm
  width: number;
  thickness: number;
  finishing?: string;
  notes?: string;
}

export function calcQuoteItems(specs: QuoteSpecs, qty: number, pricePerM3: number, laborPerUnit = 800): QuoteItem[] {
  const vol = (specs.length / 1000) * (specs.width / 1000) * (specs.thickness / 1000);
  const wood = +(vol * pricePerM3).toFixed(2);
  return [
    { description: `${specs.unitType} - ${specs.woodType} (${specs.length}×${specs.width}×${specs.thickness}mm)`, qty, unit: 'وحدة', unitPrice: wood, total: +(wood * qty).toFixed(2) },
    { description: 'تشطيب ودهان', qty, unit: 'وحدة', unitPrice: laborPerUnit * 0.4, total: +(laborPerUnit * 0.4 * qty).toFixed(2) },
    { description: 'تركيب وعمالة', qty, unit: 'وحدة', unitPrice: laborPerUnit * 0.6, total: +(laborPerUnit * 0.6 * qty).toFixed(2) },
  ];
}

export function totals(items: QuoteItem[], taxRate = 0.14) {
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const tax = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), tax, total };
}
