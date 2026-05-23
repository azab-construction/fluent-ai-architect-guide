// Parses natural-language Arabic/English requests into wood unit specs

export type UnitKind = 'wardrobe' | 'cabinet' | 'shelf' | 'table' | 'bed' | 'desk' | 'door';

export interface WoodUnitSpec {
  kind: UnitKind;
  width: number;    // cm
  height: number;   // cm
  depth: number;    // cm
  shelves: number;
  doors: number;
  drawers: number;
  woodType: 'oak' | 'walnut' | 'beech' | 'mahogany' | 'pine' | 'mdf';
  color: string;    // hex
  finish: 'matte' | 'glossy' | 'natural';
}

const WOOD_COLORS: Record<WoodUnitSpec['woodType'], string> = {
  oak: '#c19a6b',
  walnut: '#5c3a21',
  beech: '#e6c79c',
  mahogany: '#7b3f2e',
  pine: '#dcb78a',
  mdf: '#b89773',
};

const KIND_DEFAULTS: Record<UnitKind, Partial<WoodUnitSpec>> = {
  wardrobe: { width: 180, height: 220, depth: 60, shelves: 4, doors: 3, drawers: 2 },
  cabinet:  { width: 120, height: 90,  depth: 45, shelves: 2, doors: 2, drawers: 0 },
  shelf:    { width: 100, height: 180, depth: 30, shelves: 5, doors: 0, drawers: 0 },
  table:    { width: 160, height: 75,  depth: 90, shelves: 0, doors: 0, drawers: 1 },
  desk:     { width: 140, height: 75,  depth: 70, shelves: 0, doors: 0, drawers: 2 },
  bed:      { width: 180, height: 45,  depth: 200, shelves: 0, doors: 0, drawers: 2 },
  door:     { width: 90,  height: 210, depth: 5,  shelves: 0, doors: 1, drawers: 0 },
};

const KIND_KEYWORDS: Array<[UnitKind, RegExp]> = [
  ['wardrobe', /(دولاب|خزانة|wardrobe|closet)/i],
  ['cabinet',  /(خزانه|كبتة|كبت|cabinet|cupboard)/i],
  ['shelf',    /(رف|أرفف|مكتبة|shelf|bookshelf|bookcase)/i],
  ['desk',     /(مكتب\s*عمل|desk)/i],
  ['table',    /(طاولة|ترابيزة|table|dining)/i],
  ['bed',      /(سرير|bed)/i],
  ['door',     /(باب|door)/i],
];

const WOOD_KEYWORDS: Array<[WoodUnitSpec['woodType'], RegExp]> = [
  ['oak',      /(بلوط|oak)/i],
  ['walnut',   /(جوز|walnut)/i],
  ['beech',    /(زان|beech)/i],
  ['mahogany', /(ماهوجني|mahogany)/i],
  ['pine',     /(صنوبر|pine)/i],
  ['mdf',      /(mdf|mdf)/i],
];

function num(text: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(v)) return v;
    }
  }
  return null;
}

export function parseWoodRequest(text: string): WoodUnitSpec {
  const t = text.toLowerCase();

  let kind: UnitKind = 'wardrobe';
  for (const [k, re] of KIND_KEYWORDS) if (re.test(t)) { kind = k; break; }

  let woodType: WoodUnitSpec['woodType'] = 'oak';
  for (const [w, re] of WOOD_KEYWORDS) if (re.test(t)) { woodType = w; break; }

  const defaults = KIND_DEFAULTS[kind];

  // Dimensions - accept cm or m
  const width = num(t, [/(?:عرض|width)[^\d]*(\d+(?:\.\d+)?)/i, /(\d+(?:\.\d+)?)\s*(?:سم|cm)\s*(?:عرض|width)/i]) ?? defaults.width!;
  const height = num(t, [/(?:ارتفاع|طول|height)[^\d]*(\d+(?:\.\d+)?)/i]) ?? defaults.height!;
  const depth = num(t, [/(?:عمق|depth)[^\d]*(\d+(?:\.\d+)?)/i]) ?? defaults.depth!;

  const shelves = num(t, [/(\d+)\s*(?:رف|أرفف|shelves?)/i]) ?? defaults.shelves!;
  const doors = num(t, [/(\d+)\s*(?:باب|أبواب|door)/i]) ?? defaults.doors!;
  const drawers = num(t, [/(\d+)\s*(?:درج|أدراج|drawer)/i]) ?? defaults.drawers!;

  let finish: WoodUnitSpec['finish'] = 'matte';
  if (/(لامع|glossy|gloss)/i.test(t)) finish = 'glossy';
  else if (/(طبيعي|natural)/i.test(t)) finish = 'natural';

  return {
    kind, width, height, depth,
    shelves, doors, drawers,
    woodType, color: WOOD_COLORS[woodType], finish,
  };
}

export function specToArabicSummary(s: WoodUnitSpec): string {
  const kindAr: Record<UnitKind, string> = {
    wardrobe: 'دولاب', cabinet: 'خزانة', shelf: 'مكتبة/رفوف',
    table: 'طاولة', desk: 'مكتب', bed: 'سرير', door: 'باب',
  };
  return `${kindAr[s.kind]} • ${s.width}×${s.height}×${s.depth} سم • خشب ${s.woodType} • ${s.doors} باب • ${s.drawers} درج • ${s.shelves} رف`;
}
