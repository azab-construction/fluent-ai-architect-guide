import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ParsedFile {
  name: string;
  type: string;
  content: string;
  size: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.docx'];

export function isFileSupported(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_TYPES.includes(file.type) || SUPPORTED_EXTENSIONS.includes(ext);
}

export function getFileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || '';
}

export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف يتجاوز 10 ميجابايت');
  }

  if (!isFileSupported(file)) {
    throw new Error('نوع الملف غير مدعوم. الأنواع المدعومة: PDF, TXT, DOCX');
  }

  const ext = getFileExtension(file);

  let content: string;

  if (ext === 'txt' || file.type === 'text/plain') {
    content = await file.text();
  } else if (ext === 'pdf' || file.type === 'application/pdf') {
    content = await parsePDF(file);
  } else if (ext === 'docx') {
    content = await parseDOCX(file);
  } else {
    throw new Error('نوع الملف غير مدعوم');
  }

  // Truncate very long files to avoid token limits
  const maxChars = 15000;
  if (content.length > maxChars) {
    content = content.slice(0, maxChars) + '\n\n... [تم اقتطاع المحتوى - الملف طويل جداً]';
  }

  return {
    name: file.name,
    type: ext,
    content,
    size: file.size,
  };
}

async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  const maxPages = Math.min(pdf.numPages, 50);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    if (text.trim()) {
      pages.push(`--- صفحة ${i} ---\n${text}`);
    }
  }

  return pages.join('\n\n') || 'لم يتم العثور على نص في الملف';
}

async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || 'لم يتم العثور على نص في الملف';
}
