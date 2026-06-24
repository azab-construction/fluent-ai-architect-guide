// Parse financial files locally (xlsx, csv, pdf, sql, txt) into compact text
// chunks suitable for Azure OpenAI. Keeps total payload under ~60k chars.
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedFinanceFile {
  name: string;
  type: 'excel' | 'csv' | 'pdf' | 'sql' | 'text';
  content: string;
  size: number;
}

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_CHARS = 60_000;
const MAX_PER_FILE_CHARS = 20_000;

export function detectType(file: File): ParsedFinanceFile['type'] | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.xlsx') || n.endsWith('.xls')) return 'excel';
  if (n.endsWith('.csv')) return 'csv';
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.sql')) return 'sql';
  if (n.endsWith('.txt')) return 'text';
  return null;
}

export async function parseFinanceFile(file: File): Promise<ParsedFinanceFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: حجم الملف يتجاوز 15 ميجابايت`);
  const type = detectType(file);
  if (!type) throw new Error(`${file.name}: نوع غير مدعوم (المدعوم: xlsx, xls, csv, pdf, sql, txt)`);

  let content: string;
  if (type === 'excel') content = await parseExcel(file);
  else if (type === 'csv') content = await file.text();
  else if (type === 'pdf') content = await parsePDF(file);
  else content = await file.text(); // sql, text

  if (content.length > MAX_PER_FILE_CHARS) {
    content = content.slice(0, MAX_PER_FILE_CHARS) + `\n\n... [تم اقتطاع ${file.name}]`;
  }
  return { name: file.name, type, content, size: file.size };
}

async function parseExcel(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const out: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    if (csv.trim()) out.push(`--- ورقة: ${sheetName} ---\n${csv}`);
  }
  return out.join('\n\n') || '(ملف Excel فارغ)';
}

async function parsePDF(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= max; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const txt = tc.items.map((it: any) => it.str).join(' ');
    if (txt.trim()) pages.push(`--- صفحة ${i} ---\n${txt}`);
  }
  return pages.join('\n\n') || '(لم يُستخرج نص من PDF)';
}

export function enforceTotalBudget(files: ParsedFinanceFile[]): ParsedFinanceFile[] {
  let total = files.reduce((s, f) => s + f.content.length, 0);
  if (total <= MAX_TOTAL_CHARS) return files;
  const ratio = MAX_TOTAL_CHARS / total;
  return files.map(f => ({
    ...f,
    content: f.content.slice(0, Math.floor(f.content.length * ratio)) + '\n... [مقتطع]',
  }));
}
