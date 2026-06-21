import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, FileText, Database, X } from 'lucide-react';
import { ParsedFinanceFile, parseFinanceFile, enforceTotalBudget } from '@/lib/finance-parser';
import { useToast } from '@/hooks/use-toast';

interface Props {
  files: ParsedFinanceFile[];
  onChange: (files: ParsedFinanceFile[]) => void;
  disabled?: boolean;
}

const iconFor = (type: string) => {
  if (type === 'excel' || type === 'csv') return FileSpreadsheet;
  if (type === 'sql') return Database;
  return FileText;
};

export const FinanceUploader: React.FC<Props> = ({ files, onChange, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (fl: FileList | File[]) => {
    setLoading(true);
    const next: ParsedFinanceFile[] = [...files];
    for (const f of Array.from(fl)) {
      try {
        const parsed = await parseFinanceFile(f);
        next.push(parsed);
      } catch (e: any) {
        toast({ title: 'فشل قراءة الملف', description: e.message, variant: 'destructive' });
      }
    }
    onChange(enforceTotalBudget(next));
    setLoading(false);
  };

  const remove = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <Card className="p-6">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault(); setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium">اسحب وأفلت الملفات المالية هنا</p>
        <p className="text-xs text-muted-foreground mt-1">
          المدعوم: Excel (.xlsx .xls) · CSV · PDF · SQL · TXT — حتى 15MB لكل ملف
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.sql,.txt"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground mt-3 text-center">جاري قراءة الملفات...</p>}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => {
            const Icon = iconFor(f.type);
            return (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50">
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(f.size / 1024).toFixed(1)} KB · {f.content.length.toLocaleString()} حرف
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">{f.type}</Badge>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i)} disabled={disabled}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
