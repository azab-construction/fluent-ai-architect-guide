import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X, Sparkles, Star, ImageIcon, AlertCircle, Download, FileJson, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ArchAnalysis {
  style?: string;
  style_confidence?: number;
  dominant_colors?: string[];
  color_harmony?: string;
  finish_elements?: string[];
  architectural_objects?: string[];
  quality_rating?: number;
  quality_label?: string;
  notes?: string;
  summary?: string;
}

export interface AnalyzedItem {
  id: string;
  preview: string; // data URL
  fileName: string;
  status: 'idle' | 'loading' | 'done' | 'error';
  analysis?: ArchAnalysis;
  error?: string;
  createdAt: string;
}

const HISTORY_KEY = 'arch-analysis-history-v1';

function loadHistory(): AnalyzedItem[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(items: AnalyzedItem[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 30))); } catch { /* noop */ }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Downscale to max 1280px for upload efficiency.
async function resizeImage(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const ArchitectureImageAnalyzer: React.FC<{
  onHistoryChange?: (items: AnalyzedItem[]) => void;
}> = ({ onHistoryChange }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<AnalyzedItem[]>([]);
  const [notes, setNotes] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [concurrency, setConcurrency] = useState(3);

  const onDrop = useCallback(async (accepted: File[]) => {
    const newItems: AnalyzedItem[] = [];
    for (const f of accepted.slice(0, 50)) {
      const preview = await resizeImage(f);
      newItems.push({
        id: crypto.randomUUID(),
        preview,
        fileName: f.name,
        status: 'idle',
        createdAt: new Date().toISOString(),
      });
    }
    setItems(prev => [...newItems, ...prev].slice(0, 50));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 50,
    maxSize: 10 * 1024 * 1024,
  });

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const analyzeOne = async (item: AnalyzedItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'loading', error: undefined } : i));
    try {
      const { data, error } = await supabase.functions.invoke('architecture-analyze', {
        body: { imageBase64: item.preview, notes },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const analysis = (data as any)?.analysis as ArchAnalysis;
      setItems(prev => {
        const next = prev.map(i => i.id === item.id ? { ...i, status: 'done' as const, analysis } : i);
        const history = [...next.filter(i => i.status === 'done'), ...loadHistory()].slice(0, 30);
        saveHistory(history);
        onHistoryChange?.(history);
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'فشل التحليل';
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: msg } : i));
      toast({ title: 'فشل التحليل', description: msg, variant: 'destructive' });
    }
  };

  const analyzeAll = async () => {
    setBulkLoading(true);
    const queue = items.filter(i => i.status === 'idle' || i.status === 'error');
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, 6)) }, async () => {
      while (cursor < queue.length) {
        const idx = cursor++;
        await analyzeOne(queue[idx]);
      }
    });
    await Promise.all(workers);
    setBulkLoading(false);
    toast({ title: 'اكتمل التحليل', description: `تمت معالجة ${queue.length} صورة` });
  };

  const exportJSON = () => {
    const done = items.filter(i => i.status === 'done');
    const blob = new Blob([JSON.stringify(done, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `arch-analysis-${Date.now()}.json`);
  };

  const exportCSV = () => {
    const done = items.filter(i => i.status === 'done');
    const headers = ['file', 'style', 'confidence', 'quality', 'colors', 'finish', 'objects', 'notes'];
    const rows = done.map(i => {
      const a = i.analysis || {};
      return [
        i.fileName, a.style ?? '', a.style_confidence ?? '', a.quality_rating ?? '',
        (a.dominant_colors || []).join('|'),
        (a.finish_elements || []).join('|'),
        (a.architectural_objects || []).join('|'),
        (a.notes || '').replace(/\n/g, ' '),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `arch-analysis-${Date.now()}.csv`);
  };

  const done = items.filter(i => i.status === 'done');
  const processed = items.filter(i => i.status === 'done' || i.status === 'error').length;
  const progress = items.length ? Math.round((processed / items.length) * 100) : 0;
  const summary = computeSummary(done);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/30'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">اسحب وأفلت الصور هنا، أو انقر للاختيار</p>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — حتى 50 صورة، 10MB/صورة</p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">ملاحظات إضافية (اختياري)</label>
        <Textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="مثال: ركّز على عناصر التشطيب الخشبية..."
          rows={2}
        />
      </div>

      {items.length > 0 && (
        <Card className="p-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm">
              <span className="font-medium">{items.length}</span> صورة —
              <span className="text-muted-foreground"> منجزة {done.length} / فشل {items.filter(i=>i.status==='error').length}</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs text-muted-foreground">التوازي:</label>
              <select
                className="text-xs border rounded px-2 py-1 bg-background"
                value={concurrency}
                onChange={e => setConcurrency(Number(e.target.value))}
                disabled={bulkLoading}
              >
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <Button variant="outline" size="sm" onClick={() => setItems([])} disabled={bulkLoading}>مسح الكل</Button>
              <Button variant="outline" size="sm" onClick={exportCSV} disabled={done.length === 0}>
                <Download className="w-4 h-4 ml-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportJSON} disabled={done.length === 0}>
                <FileJson className="w-4 h-4 ml-1" /> JSON
              </Button>
              <Button size="sm" onClick={analyzeAll} disabled={bulkLoading || items.every(i => i.status === 'done' || i.status === 'loading')}>
                {bulkLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
                تحليل الكل
              </Button>
            </div>
          </div>
          {bulkLoading && <Progress value={progress} className="h-2" />}
          {summary && (
            <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <SummaryStat icon={<BarChart3 className="w-3 h-3" />} label="متوسط الجودة" value={`${summary.avgQuality.toFixed(1)} / 5`} />
              <SummaryStat label="النمط الأكثر" value={summary.topStyle || '—'} />
              <SummaryStat label="أبرز التشطيبات" value={summary.topFinish.join('، ') || '—'} />
              <SummaryStat label="أبرز العناصر" value={summary.topObjects.join('، ') || '—'} />
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <ResultCard
            key={item.id}
            item={item}
            onAnalyze={() => analyzeOne(item)}
            onRemove={() => removeItem(item.id)}
            onPreview={() => setLightboxIdx(idx)}
          />
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          open
          close={() => setLightboxIdx(null)}
          index={lightboxIdx}
          slides={items.map(i => ({ src: i.preview }))}
        />
      )}
    </div>
  );
};

const ResultCard: React.FC<{
  item: AnalyzedItem;
  onAnalyze: () => void;
  onRemove: () => void;
  onPreview: () => void;
}> = ({ item, onAnalyze, onRemove, onPreview }) => {
  const a = item.analysis;
  return (
    <Card className="p-4 space-y-3 relative">
      <Button size="icon" variant="ghost" className="absolute top-2 left-2 h-7 w-7" onClick={onRemove}>
        <X className="w-4 h-4" />
      </Button>

      <div className="flex items-start gap-3">
        <button onClick={onPreview} className="shrink-0">
          <img src={item.preview} alt={item.fileName} className="w-24 h-24 object-cover rounded-md border" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" dir="auto">{item.fileName}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(item.createdAt).toLocaleString('ar-EG')}
          </p>
          {item.status === 'idle' && (
            <Button size="sm" className="mt-2" onClick={onAnalyze}>
              <Sparkles className="w-4 h-4 ml-1" /> تحليل
            </Button>
          )}
          {item.status === 'loading' && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> جاري التحليل...
            </p>
          )}
          {item.status === 'error' && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {item.error}</p>
              <Button size="sm" variant="outline" onClick={onAnalyze}>إعادة المحاولة</Button>
            </div>
          )}
        </div>
      </div>

      {item.status === 'done' && a && (
        <div className="border-t pt-3 space-y-2 text-sm">
          <Row icon="🏷️" label="النمط">
            <Badge variant="secondary">{a.style || '—'}</Badge>
            {typeof a.style_confidence === 'number' && (
              <span className="text-xs text-muted-foreground">({a.style_confidence}%)</span>
            )}
          </Row>

          {a.dominant_colors && a.dominant_colors.length > 0 && (
            <Row icon="🎨" label="الألوان">
              <div className="flex flex-wrap gap-1">
                {a.dominant_colors.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
              </div>
            </Row>
          )}

          {a.finish_elements && a.finish_elements.length > 0 && (
            <Row icon="🔧" label="التشطيب">
              <div className="flex flex-wrap gap-1">
                {a.finish_elements.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
              </div>
            </Row>
          )}

          {a.architectural_objects && a.architectural_objects.length > 0 && (
            <Row icon="🏛️" label="عناصر معمارية">
              <div className="flex flex-wrap gap-1">
                {a.architectural_objects.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
              </div>
            </Row>
          )}

          {typeof a.quality_rating === 'number' && (
            <Row icon="📊" label="جودة العمل">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} className={`w-4 h-4 ${n <= (a.quality_rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                ))}
                {a.quality_label && <span className="text-xs text-muted-foreground mr-1">({a.quality_label})</span>}
              </div>
            </Row>
          )}

          {a.color_harmony && (
            <Row icon="🌈" label="تناغم الألوان">
              <span className="text-xs">{a.color_harmony}</span>
            </Row>
          )}

          {a.notes && (
            <Row icon="💬" label="ملاحظات">
              <span className="text-xs text-muted-foreground">{a.notes}</span>
            </Row>
          )}

          {a.summary && (
            <p className="text-xs italic text-muted-foreground border-t pt-2">{a.summary}</p>
          )}
        </div>
      )}
    </Card>
  );
};

const Row: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div className="flex items-start gap-2">
    <span className="text-base">{icon}</span>
    <div className="flex-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-1 mt-0.5">{children}</div>
    </div>
  </div>
);

const SummaryStat: React.FC<{ icon?: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-accent/30 rounded p-2">
    <p className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</p>
    <p className="font-medium mt-0.5 truncate" title={value}>{value}</p>
  </div>
);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function computeSummary(items: AnalyzedItem[]) {
  if (items.length === 0) return null;
  const count = (arr: string[]) => {
    const m = new Map<string, number>();
    arr.forEach(s => m.set(s, (m.get(s) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const styles = count(items.map(i => i.analysis?.style || '').filter(Boolean));
  const finish = count(items.flatMap(i => i.analysis?.finish_elements || []));
  const objects = count(items.flatMap(i => i.analysis?.architectural_objects || []));
  const qualities = items.map(i => i.analysis?.quality_rating || 0).filter(n => n > 0);
  const avgQuality = qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : 0;
  return {
    avgQuality,
    topStyle: styles[0]?.[0] || '',
    topFinish: finish.slice(0, 3).map(([k]) => k),
    topObjects: objects.slice(0, 3).map(([k]) => k),
  };
}
