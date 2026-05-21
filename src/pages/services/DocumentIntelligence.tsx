import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { LiveOperationStatus } from '@/components/azure/LiveOperationStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Loader2, FileSearch, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const fileToBase64 = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result as string);
  r.onerror = rej;
  r.readAsDataURL(f);
});

type Item = { description: string; quantity?: string; unit?: string; unitPrice?: string; amount?: string };

const DocumentIntelligence = () => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<'prebuilt-invoice' | 'prebuilt-layout'>('prebuilt-invoice');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [raw, setRaw] = useState('');
  const [extracting, setExtracting] = useState(false);

  const run = async () => {
    if (!file) return toast({ title: 'اختر ملف', variant: 'destructive' });
    setLoading(true); setItems([]); setRaw('');
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('azure-docint', {
        body: { fileBase64, model },
      });
      if (error) throw error;
      setRaw(data?.content || '');
      // Try to pull items from Azure invoice schema
      const docs = data?.raw?.analyzeResult?.documents || [];
      const fields = docs[0]?.fields?.Items?.valueArray || [];
      const parsed: Item[] = fields.map((row: any) => {
        const f = row.valueObject || {};
        return {
          description: f.Description?.valueString || f.Description?.content || '',
          quantity: f.Quantity?.valueNumber?.toString() || f.Quantity?.content || '',
          unit: f.Unit?.valueString || '',
          unitPrice: f.UnitPrice?.valueCurrency?.amount?.toString() || f.UnitPrice?.content || '',
          amount: f.Amount?.valueCurrency?.amount?.toString() || f.Amount?.content || '',
        };
      });
      setItems(parsed);
      if (!parsed.length) toast({ title: 'لم يتم العثور على بنود تلقائياً', description: 'استخدم زر "استخراج بـAI" من النص الخام' });
    } catch (e: any) { toast({ title: 'فشل', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const aiExtract = async () => {
    if (!raw) return;
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-ai-chat', {
        body: {
          model: 'gpt-5',
          messages: [
            { role: 'system', content: 'أنت محلل فواتير ومقايسات. استخرج البنود في JSON بهذا الشكل فقط: {"items":[{"description":"","quantity":"","unit":"","unitPrice":"","amount":""}]}. لا تكتب شيئاً آخر.' },
            { role: 'user', content: raw.slice(0, 12000) },
          ],
        },
      });
      if (error) throw error;
      const txt = (data?.content || '').trim().replace(/^```json|```$/g, '').trim();
      const parsed = JSON.parse(txt);
      setItems(parsed.items || []);
    } catch (e: any) { toast({ title: 'فشل استخراج AI', description: e.message, variant: 'destructive' }); }
    finally { setExtracting(false); }
  };

  const downloadCsv = () => {
    const header = 'description,quantity,unit,unitPrice,amount\n';
    const rows = items.map(i => [i.description, i.quantity, i.unit, i.unitPrice, i.amount].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoice-items.csv'; a.click();
  };

  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Document Intelligence</h1>
            <p className="text-sm text-muted-foreground">استخراج بنود الفواتير والمقايسات من PDF</p>
          </div>

          <LiveOperationStatus operation="docint" />


          <Card className="p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>ملف الفاتورة/المقايسة</Label>
                <Input type="file" accept=".pdf,.png,.jpg" onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>النموذج</Label>
                <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={model} onChange={e => setModel(e.target.value as any)}>
                  <option value="prebuilt-invoice">prebuilt-invoice (فواتير)</option>
                  <option value="prebuilt-layout">prebuilt-layout (تخطيط عام)</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={run} disabled={loading} className="gap-2 w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                  استخراج
                </Button>
              </div>
            </div>
          </Card>

          {items.length > 0 && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">البنود ({items.length})</h3>
                <Button size="sm" variant="outline" onClick={downloadCsv} className="gap-2">
                  <Download className="w-4 h-4" />تصدير CSV
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>سعر الوحدة</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{it.description}</TableCell>
                      <TableCell className="text-xs">{it.quantity}</TableCell>
                      <TableCell className="text-xs">{it.unit}</TableCell>
                      <TableCell className="text-xs">{it.unitPrice}</TableCell>
                      <TableCell className="text-xs">{it.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {raw && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">النص الخام</h3>
                <Button size="sm" variant="outline" onClick={aiExtract} disabled={extracting} className="gap-2">
                  {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  استخراج البنود بـAI
                </Button>
              </div>
              <Textarea value={raw} readOnly className="min-h-[200px] font-mono text-xs" />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligence;
