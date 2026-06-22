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
    for (const it of items.filter(i => i.status === 'idle' || i.status === 'error')) {
      await analyzeOne(it);
    }
    setBulkLoading(false);
  };

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
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — حتى 10 صور، 10MB/صورة</p>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{items.length} صورة</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setItems([])}>مسح الكل</Button>
            <Button size="sm" onClick={analyzeAll} disabled={bulkLoading || items.every(i => i.status === 'done' || i.status === 'loading')}>
              {bulkLoading ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Sparkles className="w-4 h-4 ml-1" />}
              تحليل الكل
            </Button>
          </div>
        </div>
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
